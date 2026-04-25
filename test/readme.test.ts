import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe("README guidance", () => {
  it("uses the current server API and documents the recommended server-plus-frontend split", async () => {
    const readme = await readFile(join(repoRoot, "README.md"), "utf8");

    expect(readme).toContain("import { createApp, fields, type InferAppInputs } from \"@mdanai/sdk\";");
    expect(readme).toContain("app.host(\"bun\", {");
    expect(readme).toContain("actionJson:");
    expect(readme).not.toContain("app.bindActions(");
    expect(readme).not.toContain("createHostedApp");
    expect(readme).toContain("`@mdanai/sdk`: app authoring + shipped frontend helpers");
    expect(readme).toContain("`server + frontend`");
    expect(readme).toContain("`server + surface`");
    expect(readme).toContain("`server only`");
  });
});
