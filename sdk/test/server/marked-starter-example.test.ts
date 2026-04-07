import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createAppServer } from "../../../examples/marked-starter/app/server.js";

async function readMarkedStarterSource(): Promise<string> {
  return readFile(join(process.cwd(), "examples", "marked-starter", "app", "index.md"), "utf8");
}

describe("marked starter example", () => {
  it("uses a third-party markdown renderer for browser html output", async () => {
    const source = await readMarkedStarterSource();
    const server = createAppServer({
      source,
      initialMessages: ["**Bold** entry"]
    });

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.headers["content-type"]).toBe("text/html");
    expect(response.body).toContain("<strong>shared</strong>");
    expect(response.body).toContain("<strong>Bold</strong> entry");

    const markdownResponse = await server.handle({
      method: "GET",
      url: "https://example.test/",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(markdownResponse.body).toContain('POST submit "/post" WITH message LABEL "Submit"');
  });

  it("keeps the browser entry client-only and injects the same third-party renderer into elements", async () => {
    const clientSource = await readFile(join(process.cwd(), "examples", "marked-starter", "app", "client.ts"), "utf8");

    expect(clientSource).toContain('from "marked"');
    expect(clientSource).toContain("markdownRenderer");
    expect(clientSource).toContain("@mdanai/sdk/elements");
    expect(clientSource).not.toContain("@mdanai/sdk/server");
  });
});
