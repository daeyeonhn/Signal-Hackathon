import type { Context } from "./auth";
import { HttpError } from "./http";
import { getApplication } from "./applications";
import { reviewInput, decisionInput } from "@/lib/validation";
import { BLANK_ANSWERS, STATUSES, type Review } from "@/lib/types";

export async function detail(ctx: Context, id: string) {
  const application = await getApplication(ctx, id);
  const reviews = (
    await ctx.db
      .prepare(
        `SELECT r.id,r.reviewer_id,p.name reviewer_name,r.curiosity,r.craft,r.collaboration,
    (r.curiosity+r.craft+r.collaboration) total,r.notes,r.updated_at
    FROM reviews r JOIN profiles p ON p.id=r.reviewer_id WHERE r.application_id=? ORDER BY r.updated_at DESC`,
      )
      .bind(id)
      .all<Review>()
  ).results;
  const events = (
    await ctx.db
      .prepare(
        "SELECT id,kind,message,created_at FROM events WHERE application_id=? ORDER BY created_at DESC",
      )
      .bind(id)
      .all()
  ).results;
  if (application.status === "draft") application.answers = BLANK_ANSWERS;
  return { application, reviews, events, reviewerId: ctx.profile.id };
}
export async function saveReview(ctx: Context, id: string, input: unknown) {
  const data = reviewInput.parse(input);
  const application = await getApplication(ctx, id);
  if (application.owner_id === ctx.profile.id)
    throw new HttpError(403, "You cannot review your own application.");
  if (!["submitted", "in_review"].includes(application.status))
    throw new HttpError(
      409,
      "Only pending, submitted applications can be graded.",
    );
  const now = new Date().toISOString();
  // The conditional insert and update run atomically. A concurrent decision blocks grading.
  const result = await ctx.db.batch([
    ctx.db
      .prepare(
        `INSERT INTO reviews (id,application_id,reviewer_id,curiosity,craft,collaboration,notes,updated_at)
      SELECT ?,id,?,?,?,?,?,? FROM applications WHERE id=? AND workspace_id=? AND status IN ('submitted','in_review')
      ON CONFLICT(application_id,reviewer_id) DO UPDATE SET
      curiosity=excluded.curiosity,craft=excluded.craft,collaboration=excluded.collaboration,
      notes=excluded.notes,updated_at=excluded.updated_at WHERE reviews.updated_at=?`,
      )
      .bind(
        crypto.randomUUID(),
        ctx.profile.id,
        data.curiosity,
        data.craft,
        data.collaboration,
        data.notes,
        now,
        id,
        ctx.workspace,
        data.expectedUpdatedAt,
      ),
    ctx.db
      .prepare(
        `UPDATE applications SET status='in_review',version=version+1,updated_at=?
      WHERE id=? AND workspace_id=? AND status IN ('submitted','in_review') AND changes()=1`,
      )
      .bind(now, id, ctx.workspace),
    ctx.db
      .prepare(
        `INSERT INTO events (id,application_id,kind,message,created_at)
      SELECT ?,?,'review','A rubric review was saved.',? WHERE changes()=1`,
      )
      .bind(crypto.randomUUID(), id, now),
  ]);
  if (!result[0].meta.changes)
    throw new HttpError(
      409,
      "The application or your review changed. Reload and try again.",
    );
  return detail(ctx, id);
}
export async function saveDecision(ctx: Context, id: string, input: unknown) {
  const data = decisionInput.parse(input),
    app = await getApplication(ctx, id);
  if (app.owner_id === ctx.profile.id)
    throw new HttpError(403, "You cannot decide your own application.");
  if (!app.review_count)
    throw new HttpError(
      400,
      "Save at least one review before making a decision.",
    );
  if (app.status === "draft")
    throw new HttpError(409, "A draft cannot receive a decision.");
  const now = new Date().toISOString();
  const result = await ctx.db.batch([
    ctx.db
      .prepare(
        `UPDATE applications SET status=?,decision_note=?,decision_at=?,updated_at=?,version=version+1
      WHERE id=? AND workspace_id=? AND version=? AND status!='draft'
      AND EXISTS (SELECT 1 FROM reviews WHERE application_id=applications.id)`,
      )
      .bind(data.status, data.note, now, now, id, ctx.workspace, data.version),
    ctx.db
      .prepare(
        `INSERT INTO events (id,application_id,kind,message,created_at)
      SELECT ?,?,'decision',?,? WHERE changes()=1`,
      )
      .bind(
        crypto.randomUUID(),
        id,
        "Decision: " + STATUSES[data.status] + ". " + data.note,
        now,
      ),
  ]);
  if (!result[0].meta.changes)
    throw new HttpError(
      409,
      "Another organizer updated this application. Reload before deciding.",
    );
  return detail(ctx, id);
}
