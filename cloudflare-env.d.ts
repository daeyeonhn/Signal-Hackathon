declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ORGANIZER_SETUP_HASH?: string;
    AUTH_SECRET?: string;
    AUTH_BASE_URL?: string;
  }
}
