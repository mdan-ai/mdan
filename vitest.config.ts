import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@mdsn/core": fileURLToPath(new URL("./sdk/core/src/index.ts", import.meta.url)),
      "@mdsn/server": fileURLToPath(new URL("./sdk/server/src/index.ts", import.meta.url)),
      "@mdsn/web": fileURLToPath(new URL("./sdk/web/src/index.ts", import.meta.url)),
      "@mdsn/elements": fileURLToPath(new URL("./sdk/elements/src/index.ts", import.meta.url))
    }
  },
  test: {
    environment: "jsdom",
    include: ["sdk/*/test/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"]
    }
  }
});
