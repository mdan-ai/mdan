import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe("README guidance", () => {
  it("uses the current app API and documents the recommended root-plus-surface split", async () => {
    const readme = await readFile(join(repoRoot, "README.md"), "utf8");

    expect(readme).toContain("import { createApp, fields } from \"@mdanai/sdk\";");
    expect(readme).toContain("actionJson:");
    expect(readme).not.toContain("app.bindActions(");
    expect(readme).not.toContain("createHostedApp");
    expect(readme).toContain("`app + browser shell`");
    expect(readme).toContain("`app + surface`");
    expect(readme).toContain("`server only`");
  });
});
