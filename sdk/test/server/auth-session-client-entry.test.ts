import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("auth-session browser entry", () => {
  it("stays client-only and does not import the server entry", async () => {
    const clientSource = await readFile(join(process.cwd(), "examples", "auth-session", "app", "client.ts"), "utf8");

    expect(clientSource).toContain('@mdanai/sdk/elements');
    expect(clientSource).toContain('@mdanai/sdk/web');
    expect(clientSource).toContain('mountMdanElements');
    expect(clientSource).toContain('createHeadlessHost');
    expect(clientSource).not.toContain('@mdanai/sdk/server');
    expect(clientSource).not.toContain('./index.js');
  });
});
