import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe("docs guidance", () => {
  it("keeps quickstart centered on the generated starter files", async () => {
    const quickstart = await readFile(join(repoRoot, "docs/quickstart.md"), "utf8");

    expect(quickstart).toContain("`app/index.md`");
    expect(quickstart).toContain("`app/index.action.json`");
    expect(quickstart).toContain("`app.ts`");
    expect(quickstart).toContain("`index.mjs`");
  });

  it("keeps create-mdan focused on root app authoring", async () => {
    const createMdanReadme = await readFile(join(repoRoot, "create-mdan/README.md"), "utf8");

    expect(createMdanReadme).toContain("- `@mdanai/sdk` for app authoring");
    expect(createMdanReadme).toContain("- `@mdanai/sdk/server/node` or `@mdanai/sdk/server/bun` for host integration");
    expect(createMdanReadme).not.toContain("- `@mdanai/sdk/server`");
  });
});
