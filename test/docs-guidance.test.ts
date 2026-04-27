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
    expect(quickstart).toContain("`app/server.mjs`");
    expect(quickstart).toContain("`index.mjs`");
    expect(quickstart).toContain('`app.host("node" | "bun", { frontend: true, browser: { projection: "html" } })`');
  });

  it("keeps create-mdan focused on server-first authoring", async () => {
    const createMdanReadme = await readFile(join(repoRoot, "create-mdan/README.md"), "utf8");

    expect(createMdanReadme).toContain("- `@mdanai/sdk/app` for app authoring");
    expect(createMdanReadme).toContain("- `app.host(\"node\" | \"bun\", options?)` for host integration");
    expect(createMdanReadme).toContain("- `@mdanai/sdk/core` for the shared protocol/content layer");
  });
});
