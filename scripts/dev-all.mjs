import { spawn } from "node:child_process";

const WEB_READY_TIMEOUT_MS = 120_000;
const HEALTHCHECK_INTERVAL_MS = 2_000;
const SUPABASE_REST_URL = "http://127.0.0.1:54321/rest/v1/";

let dbProcess;
let webProcess;
let shuttingDown = false;

function runCommand(command, args, options = {}) {
  return spawn(command, args, {
    stdio: "inherit",
    shell: true,
    ...options,
  });
}

function pingSupabase() {
  return fetch(SUPABASE_REST_URL, { method: "GET" })
    .then((response) => response.status === 200 || response.status === 401)
    .catch(() => false);
}

async function waitForSupabaseReady() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < WEB_READY_TIMEOUT_MS) {
    const isReady = await pingSupabase();
    if (isReady) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, HEALTHCHECK_INTERVAL_MS));
  }

  throw new Error(`Supabase did not become ready within ${WEB_READY_TIMEOUT_MS / 1000}s.`);
}

function stopSupabase() {
  return new Promise((resolve) => {
    const stopProcess = runCommand("npx", ["supabase", "stop"], { cwd: "server" });
    stopProcess.on("exit", () => resolve());
    stopProcess.on("error", () => resolve());
  });
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (webProcess && !webProcess.killed) {
    webProcess.kill("SIGINT");
  }

  if (dbProcess && !dbProcess.killed) {
    dbProcess.kill("SIGINT");
  }

  await stopSupabase();
  process.exit(exitCode);
}

async function start() {
  console.log("[dev:all] Starting local Supabase stack...");
  dbProcess = runCommand("npx", ["supabase", "start"], { cwd: "server" });

  dbProcess.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      console.error(`[dev:all] Supabase process exited early with code ${code}.`);
      shutdown(code || 1);
    }
  });

  await waitForSupabaseReady();
  console.log("[dev:all] Supabase is ready. Starting frontend...");

  webProcess = runCommand("npm", ["run", "dev"]);

  webProcess.on("exit", (code) => {
    if (!shuttingDown) {
      shutdown(code || 0);
    }
  });

  webProcess.on("error", () => {
    shutdown(1);
  });
}

process.on("SIGINT", () => {
  console.log("\n[dev:all] Caught SIGINT, shutting down...");
  shutdown(0);
});

process.on("SIGTERM", () => {
  console.log("\n[dev:all] Caught SIGTERM, shutting down...");
  shutdown(0);
});

start().catch((error) => {
  console.error("[dev:all] Failed to start development stack:", error);
  shutdown(1);
});
