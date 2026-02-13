# Server (Local Supabase Scaffold)

This directory contains local backend scaffolding for future auth, stats, and network play work.

## Prerequisites

- Node.js installed
- Docker Desktop (or equivalent Docker runtime) installed and running

## Supabase project scaffold

The Supabase project files live in `server/supabase/`.

If you need to regenerate/update the scaffold with the official CLI flow:

```bash
cd server
npx supabase init
```

## Start local Supabase only

From the repository root:

```bash
npm run dev:db
```

Stop it:

```bash
npm run dev:db:stop
```

## Start DB + frontend with one command

From the repository root:

```bash
npm run dev:all
```

This starts Supabase first, waits until the local REST endpoint is reachable, then starts the frontend dev server.

## Get local URL + keys

After Supabase is running:

```bash
cd server && npx supabase status
```

or for environment-style output:

```bash
cd server && npx supabase status -o env
```

Copy values into `.env.local` (do not commit):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
