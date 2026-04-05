import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createAppServer } from "../../../examples/vue-starter/app/server.js";

async function readVueStarterSource(): Promise<string> {
  return readFile(join(process.cwd(), "examples", "vue-starter", "app", "index.md"), "utf8");
}

describe("vue starter example", () => {
  it("keeps the server side as thin as the base starter", async () => {
    const source = (await readVueStarterSource()).replace("# Vue Starter", "# Vue Starter Example");
    const server = createAppServer({
      source,
      initialMessages: ["Vue One", "Vue Two"]
    });

    const pageResponse = await server.handle({
      method: "GET",
      url: "https://example.test/",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(pageResponse.body).toContain("# Vue Starter Example");
    expect(pageResponse.body).toContain("## 2 live messages");
    expect(pageResponse.body).toContain("- Vue One");
    expect(pageResponse.body).toContain("- Vue Two");

    const postResponse = await server.handle({
      method: "POST",
      url: "https://example.test/post",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'message: "Vue Three"',
      cookies: {}
    });

    expect(postResponse.body).toContain("## 3 live messages");
    expect(postResponse.body).toContain("- Vue Three");
  });

  it("keeps the browser entry client-only and Vue-hosted", async () => {
    const clientSource = await readFile(join(process.cwd(), "examples", "vue-starter", "app", "client.ts"), "utf8");
    const devSource = await readFile(join(process.cwd(), "examples", "vue-starter", "index.mjs"), "utf8");

    expect(clientSource).toContain('from "vue"');
    expect(clientSource).toContain('from "marked"');
    expect(clientSource).toContain("@mdanai/sdk/web");
    expect(clientSource).toContain("createHeadlessHost");
    expect(clientSource).toContain("v-html");
    expect(clientSource).not.toContain("@mdanai/sdk/elements");
    expect(clientSource).not.toContain("@mdanai/sdk/server");
    expect(clientSource).not.toContain("parseRenderableMarkdown");
    expect(devSource).toContain('"marked"');
    expect(devSource).toContain('"/app/client.js"');
  });
});
