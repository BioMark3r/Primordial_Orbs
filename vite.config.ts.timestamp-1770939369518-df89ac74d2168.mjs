// vite.config.ts
import { defineConfig } from "file:///mnt/c/Users/Nick%20Takacs/Primordial_Orbs/node_modules/vite/dist/node/index.js";
import react from "file:///mnt/c/Users/Nick%20Takacs/Primordial_Orbs/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // enables describe/it/expect globally
    environment: "jsdom",
    // for React Testing Library
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "tests/**",
      // <-- exclude Playwright folder
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
      statements: 40
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvbW50L2MvVXNlcnMvTmljayBUYWthY3MvUHJpbW9yZGlhbF9PcmJzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvbW50L2MvVXNlcnMvTmljayBUYWthY3MvUHJpbW9yZGlhbF9PcmJzL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9tbnQvYy9Vc2Vycy9OaWNrJTIwVGFrYWNzL1ByaW1vcmRpYWxfT3Jicy92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgdGVzdDoge1xuICAgIGdsb2JhbHM6IHRydWUsICAgICAgICAgICAgICAgIC8vIGVuYWJsZXMgZGVzY3JpYmUvaXQvZXhwZWN0IGdsb2JhbGx5XG4gICAgZW52aXJvbm1lbnQ6IFwianNkb21cIiwgICAgICAgICAvLyBmb3IgUmVhY3QgVGVzdGluZyBMaWJyYXJ5XG4gICAgc2V0dXBGaWxlczogW1wic3JjL3Rlc3Qvc2V0dXAudHNcIl0sXG4gICAgaW5jbHVkZTogW1wic3JjLyoqLyoue3Rlc3Qsc3BlY30ue3RzLHRzeH1cIl0sXG4gICAgZXhjbHVkZTogW1xuICAgICAgXCJ0ZXN0cy8qKlwiLCAgICAgICAgICAgICAgICAgLy8gPC0tIGV4Y2x1ZGUgUGxheXdyaWdodCBmb2xkZXJcbiAgICAgIFwiKiovbm9kZV9tb2R1bGVzLyoqXCIsXG4gICAgICBcIioqL2Rpc3QvKipcIixcbiAgICAgIFwiKiovLntpZGVhLGdpdCxjYWNoZSxvdXRwdXQsdGVtcH0vKipcIlxuICAgIF0sXG4gICAgY292ZXJhZ2U6IHtcbiAgICAgIHByb3ZpZGVyOiBcInY4XCIsXG4gICAgICByZXBvcnRlcjogW1widGV4dFwiLCBcImh0bWxcIiwgXCJsY292XCJdLFxuICAgICAgcmVwb3J0c0RpcmVjdG9yeTogXCJjb3ZlcmFnZVwiLFxuXG4gICAgICAvLyB0aHJlc2hvbGRzXG4gICAgICBsaW5lczogNDAsXG4gICAgICBmdW5jdGlvbnM6IDMwLFxuICAgICAgYnJhbmNoZXM6IDI1LFxuICAgICAgc3RhdGVtZW50czogNDAsXG4gICAgfVxuICB9XG59KTtcblxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE0UyxTQUFTLG9CQUFvQjtBQUN6VSxPQUFPLFdBQVc7QUFFbEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLE1BQU07QUFBQSxJQUNKLFNBQVM7QUFBQTtBQUFBLElBQ1QsYUFBYTtBQUFBO0FBQUEsSUFDYixZQUFZLENBQUMsbUJBQW1CO0FBQUEsSUFDaEMsU0FBUyxDQUFDLCtCQUErQjtBQUFBLElBQ3pDLFNBQVM7QUFBQSxNQUNQO0FBQUE7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsSUFDQSxVQUFVO0FBQUEsTUFDUixVQUFVO0FBQUEsTUFDVixVQUFVLENBQUMsUUFBUSxRQUFRLE1BQU07QUFBQSxNQUNqQyxrQkFBa0I7QUFBQTtBQUFBLE1BR2xCLE9BQU87QUFBQSxNQUNQLFdBQVc7QUFBQSxNQUNYLFVBQVU7QUFBQSxNQUNWLFlBQVk7QUFBQSxJQUNkO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
