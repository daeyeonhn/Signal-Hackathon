import { env } from "cloudflare:workers";
import { getIdentity } from "./identity";
import type { Profile } from "@/lib/types";
import { HttpError, sha256, rateLimit } from "./http";
export type Context = {
  db: D1Database;
  workspace: string;
  profile: Profile;
  demo: boolean;
};
export async function context(
  request: Request,
  db: D1Database,
  demo: boolean,
  organizer = false,
): Promise<Context> {
  if (demo) {
    const raw = request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)signal_demo=([a-f0-9]{64})(?:;|$)/)?.[1];
    if (!raw) throw new HttpError(401, "Start a demo from the welcome page.");
    const session = await db
      .prepare(
        "SELECT workspace_id FROM demo_sessions WHERE token_hash = ? AND expires_at > ?",
      )
      .bind(await sha256(raw), Math.floor(Date.now() / 1000))
      .first<{ workspace_id: string }>();
    if (!session)
      throw new HttpError(401, "Your demo has expired. Start a fresh demo.");
    const role = organizer
      ? "organizer"
      : new URL(request.url).searchParams.get("type") === "mentor"
        ? "mentor"
        : "hacker";
    const profile = await db
      .prepare(
        "SELECT id,name,email,role FROM profiles WHERE workspace_id = ? AND external_id = ?",
      )
      .bind(session.workspace_id, role)
      .first<Profile>();
    if (!profile) throw new HttpError(401, "Please start a fresh demo.");
    return { db, workspace: session.workspace_id, profile, demo: true };
  }
  // Identity comes from a verified, server-managed session cookie.
  const identity = await getIdentity(request.headers);
  if (!identity) throw new HttpError(401, "Sign in to continue.");
  await db
    .prepare(
      "INSERT INTO workspaces (id,kind) VALUES ('live','live') ON CONFLICT(id) DO NOTHING",
    )
    .run();
  const id = "user_" + (await sha256(identity.id));
  // Signup never grants organizer access, even if someone types an owner's email.
  await db
    .prepare(
      `INSERT INTO profiles (id,workspace_id,external_id,name,email,role,created_at)
    VALUES (?,'live',?,?,?,?,?) ON CONFLICT(workspace_id,external_id) DO NOTHING`,
    )
    .bind(
      id,
      identity.id,
      identity.name || identity.email.split("@")[0],
      identity.email,
      "unassigned",
      new Date().toISOString(),
    )
    .run();
  const profile = await db
    .prepare(
      "SELECT id,name,email,role FROM profiles WHERE id = ? AND workspace_id = 'live'",
    )
    .bind(id)
    .first<Profile>();
  if (!profile) throw new HttpError(503, "Your profile could not be loaded.");
  if (organizer && profile.role !== "organizer")
    throw new HttpError(403, "Organizer access is required.");
  return { db, workspace: "live", profile, demo: false };
}
export async function claimOrganizer(ctx: Context, code: string) {
  if (ctx.demo) throw new HttpError(403, "Use your signed-in account.");
  if (ctx.profile.role !== "unassigned" && ctx.profile.role !== "organizer")
    throw new HttpError(
      409,
      "Use a separate account for organizing and applying.",
    );
  await rateLimit(ctx.db, "setup:" + ctx.profile.id, 5, 3600);
  if (
    !env.ORGANIZER_SETUP_HASH ||
    (await sha256(code)) !== env.ORGANIZER_SETUP_HASH
  )
    throw new HttpError(403, "This setup code is not valid.");
  const out = await ctx.db.batch([
    ctx.db
      .prepare(
        "INSERT INTO settings (key,value) VALUES ('organizer_claimed',?) ON CONFLICT(key) DO NOTHING",
      )
      .bind(ctx.profile.id),
    ctx.db
      .prepare(
        "UPDATE profiles SET role = 'organizer' WHERE id = ? AND id = (SELECT value FROM settings WHERE key = 'organizer_claimed')",
      )
      .bind(ctx.profile.id),
  ]);
  if (!out[1].meta.changes)
    throw new HttpError(409, "Organizer access has already been claimed.");
}
