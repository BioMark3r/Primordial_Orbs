# Primordial Orbs – Supabase Local Backend (CLI Only)

This project can run fully local using Supabase CLI + Docker.

## Quick Start (Full Stack)

From the repo root:

```bash
npm run dev:all
```

## Manual Startup (Two-Terminal)

From the repo root:

```bash
npm run dev:db
```

In a second terminal:

```bash
npm run dev
```

When done:

```bash
npm run dev:db:stop
```

## Prerequisites

- Node.js
- Docker installed and running
- Supabase CLI (used via `npx`)

Quick checks:

```bash
docker --version
docker ps
npx supabase --version
```

## Docker Permission Fix (WSL/Ubuntu)

If you see an error like:

`permission denied while trying to connect to the Docker daemon socket...`

Run:

```bash
sudo groupadd docker 2>/dev/null || true
sudo usermod -aG docker $USER
newgrp docker
```

Then verify:

```bash
docker ps
```

If needed:

```bash
sudo systemctl restart docker
```

> In WSL you may need to close and reopen your terminal.

## Getting Supabase Keys

```bash
cd server
npx supabase status -o env
```

Copy these into `.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Use `.env.example` as a safe template, and never commit `.env.local`.

## Demo Mode / Shots Mode (auth bypass)

- `http://localhost:5173/?demo=1`
- `http://localhost:5173/?shots=1`

## Notes

- Supabase runs via Docker containers started by Supabase CLI.
- If `docker ps` works, `supabase start` should work.

## ✅ Verify Local Setup Checklist

For a quick health check of Docker, Supabase, frontend, and local env vars, use the root checklist: [README.md → Verify Local Setup](../README.md#-verify-local-setup).
