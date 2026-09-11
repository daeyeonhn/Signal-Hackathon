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

The backend requires a Worker and database.

## Development

Use Node.js 24 and the pnpm version specified in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

Tests also require Python 3. They run the actual authentication and application handlers against an in-memory SQLite database, without contacting a production database.
