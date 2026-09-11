import { z } from "zod";
import { database } from "@/db";
import { context, claimOrganizer } from "@/lib/server/auth";
import {
  checkOrigin,
  HttpError,
  json,
  readBody,
  rateLimit,
} from "@/lib/server/http";
import { startDemo } from "@/lib/server/demo";
import {
  createApplication,
  getMine,
  listApplications,
  saveApplication,
} from "@/lib/server/applications";
import { detail, saveDecision, saveReview } from "@/lib/server/reviews";
import { applicantTypeSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
async function handler(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url),
      method = request.method;
    if (method !== "GET") checkOrigin(request);
    const db = database();
    let path = url.pathname.slice(5);
    if (path === "demo" && method === "POST")
      return await startDemo(request, db);
    const demo = path.startsWith("demo/");
    if (demo) path = path.slice(5);
    const ctx = await context(
      request,
      db,
      demo,
      path.startsWith("organizer/") && path !== "organizer/claim",
    );
    if (method !== "GET")
      await rateLimit(db, "write:" + ctx.profile.id, 120, 60);
    if ((path === "me" || path === "organizer/me") && method === "GET")
      return json({ profile: ctx.profile });
    if (path === "profile" && method === "POST") {
      const data = z
        .object({
          name: z.string().trim().min(2).max(100),
          type: applicantTypeSchema,
        })
        .parse(await readBody(request));
      if (ctx.demo)
        throw new HttpError(403, "Demo accounts are already configured.");
      if (ctx.profile.role !== "unassigned")
        throw new HttpError(409, "This account already has a role.");
      await db
        .prepare(
          "UPDATE profiles SET name=?,role=? WHERE id=? AND role='unassigned'",
        )
        .bind(data.name, data.type, ctx.profile.id)
        .run();
      // Reload authoritative role in case two onboarding requests raced.
      const next = await context(request, db, false);
      await createApplication(next);
      return json(await getMine(next), 201);
    }
    if (path === "applications/mine" && method === "GET")
      return json(await getMine(ctx));
    if (path === "applications/start" && method === "POST") {
      await createApplication(ctx);
      return json(await getMine(ctx), 201);
    }
    if (path === "applications/mine" && method === "PUT")
      return json(await saveApplication(ctx, await readBody(request), false));
    if (path === "applications/submit" && method === "POST")
      return json(await saveApplication(ctx, await readBody(request), true));
    if (path === "organizer/claim" && method === "POST") {
      const data = z
        .object({ code: z.string().min(10).max(200) })
        .parse(await readBody(request));
      await claimOrganizer(ctx, data.code);
      return json({ ok: true });
    }
    if (path === "organizer/applications" && method === "GET")
      return json(await listApplications(ctx, url.searchParams));
    if (path === "organizer/team" && method === "GET") {
      const rows = await db
        .prepare(
          "SELECT name,email,role FROM profiles WHERE workspace_id=? AND role='organizer' ORDER BY created_at",
        )
        .bind(ctx.workspace)
        .all();
      return json({ members: rows.results });
    }
    if (path === "organizer/team" && method === "POST") {
      const data = z
        .object({ accountId: z.string().regex(/^user_[a-f0-9]{64}$/) })
        .parse(await readBody(request));
      if (ctx.demo)
        throw new HttpError(
          403,
          "Team access changes are available in the live workspace.",
        );
      const target = await db
        .prepare("SELECT id FROM profiles WHERE workspace_id='live' AND id=?")
        .bind(data.accountId)
        .first<{ id: string }>();
      if (!target)
        throw new HttpError(
          404,
          "Ask this person for the account ID on their Organizer access page.",
        );
      if (
        await db
          .prepare("SELECT id FROM applications WHERE owner_id=?")
          .bind(target.id)
          .first()
      )
        throw new HttpError(
          409,
          "An applicant account cannot become an organizer. Use a separate account.",
        );
      await db
        .prepare("UPDATE profiles SET role='organizer' WHERE id=?")
        .bind(target.id)
        .run();
      return json({ ok: true });
    }
    const match = path.match(
      /^organizer\/applications\/([^/]+)(?:\/(review|decision))?$/,
    );
    if (match) {
      if (!match[2] && method === "GET")
        return json(await detail(ctx, match[1]));
      if (match[2] === "review" && method === "POST")
        return json(await saveReview(ctx, match[1], await readBody(request)));
      if (match[2] === "decision" && method === "POST")
        return json(await saveDecision(ctx, match[1], await readBody(request)));
    }
    throw new HttpError(404, "This endpoint does not exist.");
  } catch (error) {
    if (error instanceof HttpError)
      return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError)
      return json({ error: error.issues.map((x) => x.message).join(" ") }, 400);
    console.error("Portal request failed", error);
    return json(
      {
        error:
          "We could not reach the database. Your unsaved text is still on this page. Please try again.",
      },
      503,
    );
  }
}
export { handler as GET, handler as POST, handler as PUT };
