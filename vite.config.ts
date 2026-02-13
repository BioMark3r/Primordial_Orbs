import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@supabase/supabase-js": path.resolve(rootDir, "src/lib/supabaseShim.ts"),
    },
  },
  test: {
    globals: true,                // enables describe/it/expect globally
    environment: "jsdom",         // for React Testing Library
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "tests/**",                 // <-- exclude Playwright folder
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**"
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",

      // thresholds
      lines: 40,
      functions: 30,
      branches: 25,
      statements: 40,
    }
  }
});
