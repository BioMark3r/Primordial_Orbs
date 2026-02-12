import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,                // enables describe/it/expect globally
    environment: "jsdom",         // for React Testing Library
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

