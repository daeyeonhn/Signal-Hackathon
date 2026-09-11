import { env } from "cloudflare:workers";

export function database(): D1Database {
  if (!env.DB) {
    throw new Error(
      "The database binding DB is unavailable. Check your server database configuration.",
    );
  }

  return env.DB;
}
