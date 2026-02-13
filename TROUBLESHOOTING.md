# Troubleshooting

## Docker permission denied

If you hit:

`permission denied while trying to connect to the Docker daemon socket...`

Run these commands:

```bash
sudo groupadd docker 2>/dev/null || true
sudo usermod -aG docker $USER
newgrp docker
docker ps
```

If it still fails:

```bash
sudo systemctl restart docker
docker ps
```

In WSL, close and reopen your terminal after group changes.

## Docker not running

Check Docker:

```bash
docker ps
```

On Linux, start it:

```bash
sudo systemctl start docker
```

If you are using WSL, make sure Docker Desktop and WSL integration are enabled (if applicable).

## Supabase won’t start

Try starting directly:

```bash
cd server && npx supabase start
```

Then check Docker containers:

```bash
docker ps
```

## Missing `dev:db` script

List scripts:

```bash
npm run
```

Confirm `dev:db` exists in the root `package.json` scripts block.

## Where to find Supabase env values

```bash
cd server && npx supabase status -o env
```

Copy values into `.env.local` and keep secrets out of git. Use `.env.example` as the template.
