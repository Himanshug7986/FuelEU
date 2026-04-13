import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "text-summary"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/infrastructure/server/index.ts"],
    },
  },
});
