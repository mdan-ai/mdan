import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe("README guidance", () => {
  it("uses the current server API and documents the three recommended entry paths", async () => {
    const readme = await readFile(join(repoRoot, "README.md"), "utf8");

    expect(readme).toContain("import { createMdanServer } from \"@mdanai/sdk/server\";");
    expect(readme).not.toContain("createHostedApp");
    expect(readme).toContain("`server + ui`");
    expect(readme).toContain("`server + surface`");
    expect(readme).toContain("`server only`");
  });
});
