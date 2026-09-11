import type { Context } from "./auth";
import { HttpError } from "./http";
import { applicationInput, validateSubmission } from "@/lib/validation";
import { BLANK_ANSWERS, type Application, type Answers } from "@/lib/types";

const aggregates = `SELECT application_id, COUNT(*) review_count,
  ROUND(AVG(curiosity+craft+collaboration),1) average_score,
  MAX(curiosity+craft+collaboration)-MIN(curiosity+craft+collaboration) score_spread
  FROM reviews GROUP BY application_id`;
export const applicationSelect = `SELECT a.*, p.name, p.email,
  COALESCE(r.review_count,0) review_count, r.average_score,
  COALESCE(r.score_spread,0) score_spread
  FROM applications a JOIN profiles p ON p.id=a.owner_id
  LEFT JOIN (${aggregates}) r ON r.application_id=a.id`;
export function mapApplication(row: Record<string, unknown>): Application {
  const { answers_json, workspace_id, ...safe } = row;
  void workspace_id;
  const status = String(row.status);
  return {
    ...safe,
    answers: JSON.parse(String(answers_json)) as Answers,
    needs_second_look:
      Number(row.review_count) >= 2 &&
      Number(row.score_spread) >= 4 &&
      ["submitted", "in_review"].includes(status),
  } as Application;
}
export async function getApplication(ctx: Context, id: string) {
  const row = await ctx.db
    .prepare(applicationSelect + " WHERE a.workspace_id=? AND a.id=?")
    .bind(ctx.workspace, id)
    .first<Record<string, unknown>>();
  if (!row) throw new HttpError(404, "Application not found.");
  return mapApplication(row);
}
export async function getMine(ctx: Context) {
  const row = await ctx.db
    .prepare(applicationSelect + " WHERE a.workspace_id=? AND a.owner_id=?")
    .bind(ctx.workspace, ctx.profile.id)
    .first<Record<string, unknown>>();
  const application = row ? mapApplication(row) : null;
  const events = application
    ? (
        await ctx.db
          .prepare(
            "SELECT id,kind,message,created_at FROM events WHERE application_id=? AND kind != 'review' ORDER BY created_at DESC",
          )
          .bind(application.id)
          .all()
      ).results
    : [];
  // Applicant responses never include organizer notes, scores, or reviewer identities.
  if (application) {
    application.review_count = 0;
    application.average_score = null;
    application.score_spread = 0;
    application.needs_second_look = false;
  }
  return { profile: ctx.profile, application, events };
}
export async function createApplication(ctx: Context) {
  if (!["hacker", "mentor"].includes(ctx.profile.role))
    throw new HttpError(403, "Choose an applicant account first.");
  const id = crypto.randomUUID(),
    now = new Date().toISOString();
  await ctx.db
    .prepare(
      `INSERT INTO applications (id,workspace_id,owner_id,type,answers_json,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?) ON CONFLICT(owner_id) DO NOTHING`,
    )
    .bind(
      id,
      ctx.workspace,
      ctx.profile.id,
      ctx.profile.role,
      JSON.stringify(BLANK_ANSWERS),
      now,
      now,
    )
    .run();
}
export async function saveApplication(
  ctx: Context,
  input: unknown,
  submit: boolean,
) {
  const data = applicationInput.parse(input);
  if (!["hacker", "mentor"].includes(ctx.profile.role))
    throw new HttpError(403, "An applicant account is required.");
  const current = await ctx.db
    .prepare(
      "SELECT id,type,status,version FROM applications WHERE workspace_id=? AND owner_id=?",
    )
    .bind(ctx.workspace, ctx.profile.id)
    .first<{
      id: string;
      type: "hacker" | "mentor";
      status: string;
      version: number;
    }>();
  if (!current) throw new HttpError(404, "Start your application first.");
  if (current.status !== "draft")
    throw new HttpError(409, "This application has already been submitted.");
  if (submit) {
    const issues = validateSubmission(data.answers, current.type);
    if (issues.length) throw new HttpError(400, issues.join(" "));
  }
  const now = new Date().toISOString();
  const update = ctx.db
    .prepare(
      `UPDATE applications SET answers_json=?,status=?,version=version+1,
    updated_at=?,submitted_at=? WHERE id=? AND workspace_id=? AND owner_id=? AND version=? AND status='draft'`,
    )
    .bind(
      JSON.stringify(data.answers),
      submit ? "submitted" : "draft",
      now,
      submit ? now : null,
      current.id,
      ctx.workspace,
      ctx.profile.id,
      data.version,
    );
  const statements = [update];
  if (submit)
    statements.push(
      ctx.db
        .prepare(
          `INSERT INTO events (id,application_id,kind,message,created_at)
    SELECT ?,?,'submitted','Application submitted. Your place in the review queue is confirmed.',? WHERE changes()=1`,
        )
        .bind(crypto.randomUUID(), current.id, now),
    );
  const result = await ctx.db.batch(statements);
  if (!result[0].meta.changes)
    throw new HttpError(
      409,
      "This draft changed in another tab. Reload before saving. Your text is still here.",
    );
  return getMine(ctx);
}
export async function listApplications(ctx: Context, query: URLSearchParams) {
  const page = Math.max(1, Math.min(10000, Number(query.get("page")) || 1));
  const search = (query.get("q") ?? "").slice(0, 150);
  const type = query.get("type"),
    status = query.get("status"),
    second = query.get("second") === "1";
  let where = " WHERE a.workspace_id=?";
  const values: (string | number)[] = [ctx.workspace];
  if (search) {
    where +=
      " AND (p.name LIKE ? ESCAPE '\\' OR p.email LIKE ? ESCAPE '\\' OR a.id LIKE ? ESCAPE '\\')";
    const escaped = "%" + search.replace(/[\\%_]/g, "\\$&") + "%";
    values.push(escaped, escaped, escaped);
  }
  if (type === "hacker" || type === "mentor") {
    where += " AND a.type=?";
    values.push(type);
  }
  if (status && status !== "all") {
    where += " AND a.status=?";
    values.push(status);
  }
  if (second)
    where +=
      " AND r.review_count>=2 AND r.score_spread>=4 AND a.status IN ('submitted','in_review')";
  const count = await ctx.db
    .prepare("SELECT COUNT(*) total FROM (" + applicationSelect + where + ")")
    .bind(...values)
    .first<{ total: number }>();
  const rows = await ctx.db
    .prepare(
      applicationSelect +
        where +
        " ORDER BY a.created_at DESC,a.id LIMIT 12 OFFSET ?",
    )
    .bind(...values, (page - 1) * 12)
    .all<Record<string, unknown>>();
  const stats = await ctx.db
    .prepare(
      `SELECT COUNT(*) total,
    SUM(CASE WHEN a.status IN ('submitted','in_review') THEN 1 ELSE 0 END) pending,
    SUM(CASE WHEN a.status='accepted' THEN 1 ELSE 0 END) accepted,
    SUM(CASE WHEN r.review_count>=2 AND r.score_spread>=4 AND a.status IN ('submitted','in_review') THEN 1 ELSE 0 END) secondLook
    FROM applications a LEFT JOIN (${aggregates}) r ON r.application_id=a.id WHERE a.workspace_id=?`,
    )
    .bind(ctx.workspace)
    .first();
  return {
    applications: rows.results.map((row) => {
      const a = mapApplication(row);
      a.answers = BLANK_ANSWERS;
      return a;
    }),
    total: count?.total ?? 0,
    page,
    stats,
  };
}
