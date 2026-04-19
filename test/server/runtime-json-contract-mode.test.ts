import { describe, expect, it } from "vitest";

import { createMdanServer, ok } from "../../src/server/index.js";

describe("json contract mode", () => {
	  it("rejects non-json action results", async () => {
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

    expect(response.status).toBe(500);
    expect(String(response.body)).toContain("JSON Contract Violation");
  });

  it("rejects content-action mismatches during server-side consistency validation", async () => {
    const server = createMdanServer({ actionProof: { disabled: true } });
    server.page("/entry", async () => ({
      content: `# Demo

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
      view: {
        route_path: "/entry",
        regions: {
          main: "Body"
        }
      }
    }));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/entry",
      headers: {
        accept: "application/json"
      },
      cookies: {}
    });

    expect(response.status).toBe(500);
    expect(String(response.body)).toContain("Actions Contract Violation");
    expect(String(response.body)).toContain("missing_action");
  });
});
