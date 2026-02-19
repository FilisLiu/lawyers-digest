import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "**/*.config.*",
        "**/main.ts", // Plugin entry point - hard to test without Obsidian
        "**/settings.ts", // UI component - requires Obsidian
        "**/modal.ts", // UI component - requires Obsidian
      ],
    },
  },
  resolve: {
    alias: {
      obsidian: new URL("./src/__mocks__/obsidian.ts", import.meta.url).pathname,
    },
  },
});
