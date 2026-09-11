export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(value: unknown, status = 200, extra: HeadersInit = {}) {
  const headers = new Headers(extra);
  headers.set("Content-Type", "application/json");
  headers.set("Cache-Control", "no-store, private");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(JSON.stringify(value), { status, headers });
}
export async function readBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Send JSON data.");
  const text = await request.text();
  if (text.length > 16000)
    throw new HttpError(413, "This request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "The request could not be read.");
  }
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (origin && origin !== new URL(request.url).origin)
  )
    throw new HttpError(403, "Please submit this request from the portal.");
}
export async function sha256(value: string) {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(buffer)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export function token() {
  return [...crypto.getRandomValues(new Uint8Array(32))]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function rateLimit(
  db: D1Database,
  key: string,
  max: number,
  seconds: number,
) {
  const now = Math.floor(Date.now() / 1000);
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (id,count,expires_at) VALUES (?,1,?)
    ON CONFLICT(id) DO UPDATE SET
    count = CASE WHEN rate_limits.expires_at < ? THEN 1 ELSE rate_limits.count + 1 END,
    expires_at = CASE WHEN rate_limits.expires_at < ? THEN excluded.expires_at ELSE rate_limits.expires_at END
    RETURNING count`,
    )
    .bind(key, now + seconds, now, now)
    .first<{ count: number }>();
  if ((row?.count ?? 0) > max)
    throw new HttpError(
      429,
      "Too many requests. Please wait a moment and try again.",
    );
}
