# Backend Scaffold (Supabase)

This `/server` folder is intentionally lightweight for now.

The game currently runs as a frontend-only app, but this directory marks the future backend boundary so the repository has a clear split between:

- `src/` → app/client code
- `server/` → backend infrastructure and services

## Run Supabase locally

Use the Supabase CLI (which uses Docker under the hood) for local backend services.

Typical workflow:

```bash
supabase start
```

This command boots the local Supabase stack in Docker.

To stop it:

```bash
supabase stop
```

## Local API URL and keys

After `supabase start`, local connection details are shown in CLI output and can also be read from your local Supabase config/status output.

You will generally use:

- **API URL** (local Supabase endpoint)
- **anon key** (public client key)
- **service_role key** (server-only secret key)

Important:

- Use the **anon key** in frontend/client contexts.
- Use the **service_role key** only in trusted server environments (never ship it to the browser).

When backend work begins, these values should be loaded via environment variables and documented here with exact project-specific commands.
