import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createAppServer } from "../../../examples/react-starter/app/server.js";

async function readReactStarterSource(): Promise<string> {
  return readFile(join(process.cwd(), "examples", "react-starter", "app", "index.md"), "utf8");
}

describe("react starter example", () => {
  it("keeps the server side as thin as the base starter", async () => {
    const source = (await readReactStarterSource()).replace("# React Starter", "# React Starter Example");
    const server = createAppServer({
      source,
      initialMessages: ["React One", "React Two"]
    });

    const pageResponse = await server.handle({
      method: "GET",
      url: "https://example.test/",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(pageResponse.body).toContain("# React Starter Example");
    expect(pageResponse.body).toContain("## 2 live messages");
    expect(pageResponse.body).toContain("- React One");
    expect(pageResponse.body).toContain("- React Two");

    const postResponse = await server.handle({
      method: "POST",
      url: "https://example.test/post",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'message: "React Three"',
      cookies: {}
    });

    expect(postResponse.body).toContain("## 3 live messages");
    expect(postResponse.body).toContain("- React Three");
  });

  it("keeps the browser entry client-only and React-hosted", async () => {
    const clientSource = await readFile(join(process.cwd(), "examples", "react-starter", "app", "client.tsx"), "utf8");
    const devSource = await readFile(join(process.cwd(), "examples", "react-starter", "index.mjs"), "utf8");

    expect(clientSource).toContain('from "react"');
    expect(clientSource).toContain('from "react-dom/client"');
    expect(clientSource).toContain('from "marked"');
    expect(clientSource).toContain("@mdanai/sdk/web");
    expect(clientSource).toContain("createHeadlessHost");
    expect(clientSource).toContain("dangerouslySetInnerHTML");
    expect(clientSource).not.toContain("@mdanai/sdk/elements");
    expect(clientSource).not.toContain("@mdanai/sdk/server");
    expect(clientSource).not.toContain("parseRenderableMarkdown");

    expect(devSource).toContain('from "esbuild"');
    expect(devSource).toContain("client.browser.js");
    expect(devSource).toContain('"/app/client.js"');
    expect(devSource).not.toContain('/node_modules/react/index.js');
    expect(devSource).not.toContain('/node_modules/react-dom/client.js');
  });
});
