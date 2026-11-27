import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/node_modules/", "cache/", "docs/ui/", "**/.output/", "**/.nuxt/"] },
  ...tseslint.configs.recommended,
  {
    // PM2 loads ecosystem.config.cjs as CommonJS, so it must use require().
    files: ["**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
);
