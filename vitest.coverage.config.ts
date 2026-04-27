import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      ...configDefaults.exclude,
      "archive/**"
    ],
    coverage: {
      provider: "v8",
      include: [
        "src/surface/adapter.ts",
        "src/content/agent-blocks.ts",
        "src/server/errors.ts",
        "src/protocol/input/input-schema.ts",
        "src/server/json-body.ts",
        "src/content/markdown-body.ts",
        "src/content/markdown-renderer.ts",
        "src/protocol/negotiate.ts",
        "src/content/serialize.ts",
        "src/server/adapter-shared.ts",
        "src/server/bun.ts",
        "src/server/content-type.ts",
        "src/server/result.ts",
        "src/server/router.ts",
        "src/server/runtime.ts",
        "src/server/session.ts",
        "src/core/surface/presentation.ts",
        "src/server/sse.ts"
      ],
      thresholds: {
        lines: 75,
        branches: 65,
        functions: 75
      }
    }
  }
});
