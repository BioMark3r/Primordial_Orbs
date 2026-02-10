import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    viewport: { width: 1365, height: 768 },
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  webServer: {
    command: "npm run dev -- --host 0.0.0.0 --port 5173",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
