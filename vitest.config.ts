import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.ts", "apps/*/shared/**/*.test.ts", "apps/*/app/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
