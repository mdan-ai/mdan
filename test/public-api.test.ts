import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(new URL(".", import.meta.url)));

describe("package export boundary", () => {
  it("publishes the root app API but keeps protocol entrypoints internal", async () => {
    const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8")) as {
      exports?: Record<string, unknown>;
    };
    const exportsMap = packageJson.exports ?? {};

    expect(Object.prototype.hasOwnProperty.call(exportsMap, ".")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./protocol")).toBe(false);
  });
});
