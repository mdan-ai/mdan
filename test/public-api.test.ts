import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(new URL(".", import.meta.url)));

describe("package export boundary", () => {
  it("does not publish root or protocol entrypoints", async () => {
    const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8")) as {
      exports?: Record<string, unknown>;
    };
    const exportsMap = packageJson.exports ?? {};

    expect(Object.prototype.hasOwnProperty.call(exportsMap, ".")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./protocol")).toBe(false);
  });
});
