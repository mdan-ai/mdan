import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe("docs guidance", () => {
  it("keeps developer paths centered on root plus surface", async () => {
    const developerPaths = await readFile(join(repoRoot, "docs/developer-paths.md"), "utf8");

    expect(developerPaths).toContain("## Path A: App + Browser Shell");
    expect(developerPaths).toContain("## Path B: App + Surface + Your Own UI");
    expect(developerPaths).toContain("For new work, default to:");
    expect(developerPaths).toContain("`@mdanai/sdk` for app authoring");
    expect(developerPaths).toContain("`@mdanai/sdk/surface` only when you need a custom frontend");
    expect(developerPaths).not.toContain("optional `@mdanai/sdk/ui`");
  });

  it("keeps create-mdan focused on root app authoring", async () => {
    const createMdanReadme = await readFile(join(repoRoot, "create-mdan/README.md"), "utf8");

    expect(createMdanReadme).toContain("- `@mdanai/sdk` for app authoring");
    expect(createMdanReadme).toContain("- `@mdanai/sdk/server/node` or `@mdanai/sdk/server/bun` for host integration");
    expect(createMdanReadme).not.toContain("- `@mdanai/sdk/server`");
  });
});
