# Supabase Todo Demo

A minimal [Next.js](https://nextjs.org) (App Router, TypeScript) todo app backed by a
**local Supabase stack**. Users are signed in **anonymously** and can only see and modify
their own todos, enforced by Postgres **Row Level Security (RLS)**.

Everything runs locally on the loopback interface (`127.0.0.1`). No cloud project, no
service-role key, and no data leaves your machine.

## Prerequisites

- Node.js 20+ and npm (developed against Node 24, npm 11).
- [Supabase CLI](https://supabase.com/docs/guides/local-development) v2.121.0+.
- Apple Silicon (arm64) macOS for the native runtime (see below).

## Local Supabase (native runtime, no Docker/Finch)

This project uses the Supabase CLI's **experimental native local stack**, which runs the
Supabase services as native processes instead of containers. It is enabled in
`supabase/config.toml`:

```toml
[experimental]
stack = true
```

> **Note:** Docker and Finch are **not** used or required by this project, and Finch is
> not a directly supported container runtime for Supabase. The native runtime is selected
> explicitly with `--runtime native`. (The CLI otherwise auto-selects Docker, then
> Podman, then native.)

### Start the stack (first time)

The runtime choice is persisted per stack, so pass `--runtime native` the first time:

```bash
supabase stack start --runtime native --experimental
```

On later runs you can simply resume it:

```bash
supabase stack start --experimental
```

### Get the local URL and publishable key

```bash
supabase status --experimental --env
```

Use these two values (shown as `API_URL` and `PUBLISHABLE_KEY`):

- `API_URL`  → `NEXT_PUBLIC_SUPABASE_URL`
- `PUBLISHABLE_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Only ever use the **publishable** (anon-tier) key in the app. Never put the
service-role / secret key in the client or in `.env.local`.

> This project runs the stack on a non-default port block (`55321`–`55329`) so it does not
> collide with any other Supabase stack already using the defaults (`54321`–`54329`). The
> exact URL/ports always come from `supabase status`.

## Environment variables

```bash
cp .env.local.example .env.local
```

Then set the two values from `supabase status --experimental --env`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`.env.local` is git-ignored. Only `.env.local.example` (placeholders) is committed.

## Database migration

The schema lives in `supabase/migrations/`. Apply it by resetting the local database,
which drops, recreates, re-runs all migrations, and re-seeds:

```bash
supabase db reset --local --experimental
```

The `public.todos` table has owner-scoped RLS policies: an authenticated user (including an
anonymous one after sign-in) may only `select`/`insert`/`update`/`delete` their own rows.
The `anon` role (no session) is granted nothing.

Each todo also carries a numeric `priority`: an integer from 1 (lowest) through 5 (highest),
defaulting to 3. It can be set when creating a todo and changed afterward.

## Run the app

```bash
npm install          # first time only
npm run dev          # dev server at http://127.0.0.1:3000
npm run build        # production build
npm run start        # production server at http://127.0.0.1:3000
npm run lint         # eslint
```

All app servers bind to `127.0.0.1` only.

Open http://127.0.0.1:3000 — the app signs you in anonymously and lets you add, complete,
and delete todos.

## Stop the stack

```bash
supabase stack stop --experimental     # stop (keep data)
supabase stack destroy --experimental  # stop and remove the stack
```

## Project layout

```
app/
  layout.tsx          Root layout
  page.tsx            Todo UI (client component, @supabase/supabase-js)
  globals.css         Minimal styles
lib/
  supabaseClient.ts   Browser Supabase client (publishable key only)
supabase/
  config.toml         Local stack config (native runtime, anonymous sign-ins)
  migrations/         SQL migration for public.todos + RLS
.env.local.example    Template env file
```
