# Signal — Hackathon Portal

A hackathon application platform for hackers, mentors, and organizers.

## Features

- Independent email/password accounts and optional Google sign-in.
- Separate hacker and mentor applications with saved drafts and submission validation.
- Organizer search, status filters, pagination, rubric grading, and decision notes.
- A **Second look** queue surfaces pending applications when two or more reviewers' totals differ by at least four points.
- Private reviewer notes, applicant-visible status history, and isolated demo workspaces.

## Stack

React, TypeScript, Tailwind CSS, Next.js App Router conventions, Vinext, Cloudflare Workers and D1, Drizzle, Better Auth, and Zod.

The backend requires a Worker and database. The application cannot be hosted as a static GitHub Pages export.

## Development

Use Node.js 24 and the pnpm version specified in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

Tests also require Python 3. They run the actual authentication and application handlers against an in-memory SQLite database, without contacting a production database.

Copy `.env.example` to `.dev.vars` for local development. Set `AUTH_BASE_URL` to the local origin and generate a unique `AUTH_SECRET` of at least 32 characters. Keep secrets out of Git.

## Authentication and permissions

`lib/auth.ts` configures the authentication provider. Email passwords use its salted scrypt hashing. HTTPS deployments use secure HTTP-only session cookies. Google sign-in is shown only when both Google credentials are set. Email verification and password-reset mail are not configured in this prototype.

Every new account starts without organizer privileges. Use `node scripts/create-organizer-code.mjs`, store its hash as `ORGANIZER_SETUP_HASH`, and enter the private code on the Organizer access page. This can bootstrap only one organizer. Additional organizers are granted access by their exact account ID through Review team. Use separate accounts for organizing and applying.

`lib/server/auth.ts` enforces permissions; hiding a button in the interface is not an access control.

## Database

The Worker expects a D1 binding named `DB`. Keep all migrations in `drizzle/`; apply them in order. Authentication tables and application tables are separate. An independent deployment starts with a fresh database unless data is explicitly migrated.

## Environment

| Variable | Purpose |
| --- | --- |
| `AUTH_BASE_URL` | Exact site origin, without a trailing path |
| `AUTH_SECRET` | Private authentication signing/encryption secret |
| `ORGANIZER_SETUP_HASH` | Digest of the first organizer's private setup code |
| `GOOGLE_CLIENT_ID` | Optional Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Optional private Google OAuth secret |

For Google, register the exact redirect URI `https://YOUR-DOMAIN/api/auth/callback/google`. Do not reuse the local development origin in production.

## Prototype scope

The portal supports the application and review workflow; it does not send decision emails, offer password recovery, or automatically verify email/password addresses. The demo is backed by isolated database records that expire after three days. Vinext is a beta dependency; assess its release status before using this for an actual event at scale.

## Independent deployment

1. Install dependencies with `pnpm install --frozen-lockfile`.
2. Run `pnpm exec wrangler login`, then `pnpm exec wrangler d1 create signal-db`.
3. Replace the database ID and `AUTH_BASE_URL` in `wrangler.jsonc` with your database and Worker origin.
4. Run `pnpm db:remote`, `pnpm build`, and `pnpm deploy`.
5. Add the private `AUTH_SECRET` and `ORGANIZER_SETUP_HASH` through Worker secrets.
6. Optionally set Google OAuth credentials and register your callback URL.
7. Connect the repository through the Worker's Builds settings for future updates.

For local development, create `.dev.vars`, run `pnpm db:local`, and run `pnpm dev`. The local database is separate from production.
