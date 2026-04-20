import { describe, expect, it } from "vitest";

import { createMdanServer, ok } from "../../src/server/index.js";

describe("legacy compatibility contract mode", () => {
  it("returns 406 for artifact-native POST actions asked for application/json", async () => {
    const server = createMdanServer({ actionProof: { disabled: true } });
    server.post("/submit", async () =>
      ok({
        fragment: {
          markdown: "## Legacy result",
          blocks: []
        }
      })
    );

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/submit",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: "",
      cookies: {}
    });

    expect(response.status).toBe(406);
    expect(String(response.body)).toContain("## Not Acceptable");
  });

  it("rejects content-action mismatches during server-side consistency validation", async () => {
    const server = createMdanServer({ actionProof: { disabled: true } });
    server.page("/entry", async () => ({
      markdown: `# Demo

::: block{id="main" actions="missing_action"}
Body
:::`,
      actions: {
        app_id: "contracts-test",
        state_id: "contracts-test:page",
        state_version: 1,
        actions: [
          {
            id: "open",
            verb: "navigate",
            target: "/open"
          }
        ]
      },
      route: "/entry",
      regions: {
        main: "Body"
      }
    }));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/entry",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(response.status).toBe(500);
    expect(String(response.body)).toContain("Actions Contract Violation");
    expect(String(response.body)).toContain("missing_action");
  });

  it("accepts artifact-native page handlers for markdown and html reads", async () => {
    const server = createMdanServer({ actionProof: { disabled: true } });
    server.page("/artifact", async () => ({
      markdown: "# Artifact Page",
      executableContent: JSON.stringify({ app_id: "artifact-demo" }, null, 2),
      frontmatter: {},
      blocks: [],
      blockAnchors: []
    }));

    const markdown = await server.handle({
      method: "GET",
      url: "https://example.test/artifact",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(markdown.status).toBe(200);
    expect(String(markdown.body)).toContain("# Artifact Page");
    expect(String(markdown.body)).toContain("```mdan");

    const html = await server.handle({
      method: "GET",
      url: "https://example.test/artifact",
      headers: {
        accept: "text/html"
      },
      cookies: {}
    });

    expect(html.status).toBe(200);
    expect(String(html.body)).toContain("<h1>Artifact Page</h1>");
    expect(String(html.body)).not.toContain('id="mdan-initial-surface"');

    const json = await server.handle({
      method: "GET",
      url: "https://example.test/artifact",
      headers: {
        accept: "application/json"
      },
      cookies: {}
    });

    expect(json.status).toBe(406);
    expect(String(json.body)).toContain("## Not Acceptable");
  });

  it("accepts readable-surface page handlers for markdown and html reads", async () => {
    const server = createMdanServer({ actionProof: { disabled: true } });
    server.page("/readable", async () => ({
      markdown: "# Readable Page\n\n::: block{id=\"main\"}\nBody\n:::",
      actions: {
        app_id: "readable-demo",
        state_id: "readable-demo:1",
        state_version: 1,
        blocks: ["main"],
        actions: []
      },
      route: "/readable",
      regions: {
        main: "Body"
      }
    }));

    const markdown = await server.handle({
      method: "GET",
      url: "https://example.test/readable",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(markdown.status).toBe(200);
    expect(String(markdown.body)).toContain("# Readable Page");

    const html = await server.handle({
      method: "GET",
      url: "https://example.test/readable",
      headers: {
        accept: "text/html"
      },
      cookies: {}
    });

    expect(html.status).toBe(200);
    expect(String(html.body)).toContain("<h1>Readable Page</h1>");
    expect(String(html.body)).toContain("Body");
    expect(String(html.body)).not.toContain('id="mdan-initial-surface"');

    const json = await server.handle({
      method: "GET",
      url: "https://example.test/readable",
      headers: {
        accept: "application/json"
      },
      cookies: {}
    });

    expect(json.status).toBe(406);
    expect(String(json.body)).toContain("## Not Acceptable");
  });

  it("accepts artifact-native GET action results on markdown reads", async () => {
    const server = createMdanServer({ actionProof: { disabled: true } });
    server.get("/refresh", async () =>
      ok({
        fragment: {
          markdown: "## Saved",
          executableContent: JSON.stringify({ actions: [{ id: "next" }] }, null, 2),
          blocks: []
        }
      })
    );

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/refresh",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(String(response.body)).toContain("## Saved");
    expect(String(response.body)).toContain("```mdan");
    expect(String(response.body)).toContain('"id": "next"');
  });

  it("accepts artifact-native POST action results on markdown reads", async () => {
    const server = createMdanServer({ actionProof: { disabled: true } });
    server.post("/submit-markdown", async () =>
      ok({
        page: {
          frontmatter: {
            app_id: "post-artifact",
            state_id: "post-artifact:1",
            state_version: 1,
            route: "/after-submit"
          },
          markdown: "# Submitted",
          blocks: [],
          blockAnchors: []
        },
        route: "/after-submit"
      })
    );

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/submit-markdown",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: JSON.stringify({ input: {} }),
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(String(response.body)).toContain("# Submitted");
  });
});
