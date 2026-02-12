export default [
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {},
  },
  {
    ignores: ["dist/**", "node_modules/**", "**/*.{ts,tsx}"],
  },
];
