import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@mdanai/sdk/core": fileURLToPath(new URL("./sdk/src/core/index.ts", import.meta.url)),
      "@mdanai/sdk/server/node": fileURLToPath(new URL("./sdk/src/server/node-runtime.ts", import.meta.url)),
      "@mdanai/sdk/server/bun": fileURLToPath(new URL("./sdk/src/server/bun.ts", import.meta.url)),
      "@mdanai/sdk/server": fileURLToPath(new URL("./sdk/src/server/index.ts", import.meta.url)),
      "@mdanai/sdk/web": fileURLToPath(new URL("./sdk/src/web/index.ts", import.meta.url)),
      "@mdanai/sdk/elements": fileURLToPath(new URL("./sdk/src/elements/index.ts", import.meta.url)),
      "@mdanai/sdk": fileURLToPath(new URL("./sdk/src/index.ts", import.meta.url))
    }
  },
  test: {
    environment: "jsdom",
    include: ["sdk/test/**/*.test.ts", "create-mdan/test/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"]
    }
  }
});
