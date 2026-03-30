import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@mdsn/core": fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url)),
      "@mdsn/server": fileURLToPath(new URL("./packages/server/src/index.ts", import.meta.url)),
      "@mdsn/web": fileURLToPath(new URL("./packages/web/src/index.ts", import.meta.url)),
      "@mdsn/elements": fileURLToPath(new URL("./packages/elements/src/index.ts", import.meta.url))
    }
  },
  test: {
    environment: "jsdom",
    include: ["packages/*/test/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"]
    }
  }
});
