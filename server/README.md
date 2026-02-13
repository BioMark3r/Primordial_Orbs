# Backend Scaffold (Supabase)

This `/server` folder is intentionally lightweight for now.

The game currently runs as a frontend-only app, but this directory marks the future backend boundary so the repository has a clear split between:

- `src/` → app/client code
- `server/` → backend infrastructure and services

## Supabase local dev

The Supabase project scaffold lives in [`/server/supabase`](./supabase).

Start the full local Supabase stack (Docker required):

```bash
npx supabase start
```

Get local API URL and keys in env format:

```bash
npx supabase status -o env
```

Typical frontend variables you should copy into `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Stop the local stack when done:

```bash
npx supabase stop
```
