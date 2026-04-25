import { describe, expect, it } from "vitest";

import { createMdanServer, ok } from "../../src/server/index.js";

describe("markdown-native contract mode", () => {
  it("returns 406 for Markdown-native POST actions asked for application/json", async () => {
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

Body

<!-- mdan:block id="main" -->`,
      actions: {
        app_id: "contracts-test",
        state_id: "contracts-test:page",
        state_version: 1,
        blocks: {
          main: { actions: ["missing_action"] }
        },
        actions: {
          open: {
            verb: "route",
            target: "/open"
          }
        }
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

  it("accepts Markdown-native page handlers for markdown reads and rejects html negotiation", async () => {
    const server = createMdanServer({ actionProof: { disabled: true } });
    server.page("/markdown", async () => ({
      markdown: "# Markdown Page",
      executableContent: JSON.stringify({ app_id: "markdown-demo" }, null, 2),
      frontmatter: {},
      blocks: []
    }));

    const markdown = await server.handle({
      method: "GET",
      url: "https://example.test/markdown",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(markdown.status).toBe(200);
    expect(String(markdown.body)).toContain("# Markdown Page");
    expect(String(markdown.body)).toContain("```mdan");

    const html = await server.handle({
      method: "GET",
      url: "https://example.test/markdown",
      headers: {
        accept: "text/html"
      },
      cookies: {}
    });

    expect(html.status).toBe(406);
    expect(String(html.body)).toContain("## Not Acceptable");

    const json = await server.handle({
      method: "GET",
      url: "https://example.test/markdown",
      headers: {
        accept: "application/json"
      },
      cookies: {}
    });

    expect(json.status).toBe(406);
    expect(String(json.body)).toContain("## Not Acceptable");
  });

  it("accepts readable-surface page handlers for markdown reads and rejects html negotiation", async () => {
    const server = createMdanServer({ actionProof: { disabled: true } });
    server.page("/readable", async () => ({
      markdown: "# Readable Page\n\n<!-- mdan:block id=\"main\" -->\nBody",
      actions: {
        app_id: "readable-demo",
        state_id: "readable-demo:1",
        state_version: 1,
        blocks: {
          main: { actions: [] }
        },
        actions: {}
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

    expect(html.status).toBe(406);
    expect(String(html.body)).toContain("## Not Acceptable");

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

  it("accepts readable-surface page handlers without explicit state metadata", async () => {
    const server = createMdanServer({ actionProof: { disabled: true } });
    server.page("/implicit-state", async () => ({
      markdown: "# Implicit State\n\n<!-- mdan:block id=\"main\" -->\nBody",
      actions: {
        app_id: "implicit-demo",
        blocks: {
          main: { actions: [] }
        },
        actions: {}
      },
      route: "/implicit-state",
      regions: {
        main: "Body"
      }
    }));

    const markdown = await server.handle({
      method: "GET",
      url: "https://example.test/implicit-state",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(markdown.status).toBe(200);
    expect(String(markdown.body)).toContain("# Implicit State");
    expect(String(markdown.body)).toContain('"state_id": "implicit-demo:implicit-state"');
    expect(String(markdown.body)).toMatch(/"state_version": \d+/);
  });

  it("fills missing readable-surface app identity from createMdanServer appId", async () => {
    const server = createMdanServer({
      appId: "fallback-demo",
      actionProof: { disabled: true }
    });
    server.page("/fallback-app", async () => ({
      markdown: "# Fallback App\n\n<!-- mdan:block id=\"main\" -->\nBody",
      actions: {
        blocks: {
          main: { actions: [] }
        },
        actions: {}
      },
      route: "/fallback-app",
      regions: {
        main: "Body"
      }
    }));

    const markdown = await server.handle({
      method: "GET",
      url: "https://example.test/fallback-app",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(markdown.status).toBe(200);
    expect(String(markdown.body)).toContain('"app_id": "fallback-demo"');
    expect(String(markdown.body)).toContain('"state_id": "fallback-demo:fallback-app"');
  });

  it("accepts Markdown-native GET action results on markdown reads", async () => {
    const server = createMdanServer({ actionProof: { disabled: true } });
    server.get("/refresh", async () =>
      ok({
        fragment: {
          markdown: "## Saved",
          executableContent: JSON.stringify({ actions: { next: {} } }, null, 2),
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
    expect(String(response.body)).toContain('"next": {}');
  });

  it("rejects invalid readable-surface GET action results during runtime validation", async () => {
    const server = createMdanServer({ actionProof: { disabled: true } });
    server.get("/broken", async () => ({
      markdown: `# Broken

Broken

<!-- mdan:block id="main" -->`,
      actions: {
        app_id: "broken-demo",
        state_id: "broken-demo:1",
        state_version: 1,
        blocks: {
          main: { actions: ["missing_action"] }
        },
        actions: {
          open: {
            verb: "route",
            target: "/open"
          }
        }
      },
      route: "/broken",
      regions: {
        main: "Broken"
      }
    }));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/broken",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(response.status).toBe(500);
    expect(String(response.body)).toContain("Actions Contract Violation");
    expect(String(response.body)).toContain("missing_action");
  });

  it("accepts Markdown-native POST action results on markdown reads", async () => {
    const server = createMdanServer({ actionProof: { disabled: true } });
    server.post("/submit-markdown", async () =>
      ok({
        page: {
          frontmatter: {
            app_id: "post-markdown",
            state_id: "post-markdown:1",
            state_version: 1,
            route: "/after-submit"
          },
          markdown: "# Submitted",
          blocks: []
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

  it("rejects invalid action handler payloads with a runtime error result", async () => {
    const server = createMdanServer({ actionProof: { disabled: true } });
    server.post("/broken-action", async () => ({ foo: "bar" } as never));

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/broken-action",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: JSON.stringify({ input: {} }),
      cookies: {}
    });

    expect(response.status).toBe(500);
    expect(String(response.body)).toContain("Invalid Action Handler Result");
  });

  it("commits page handler session mutations on markdown reads", async () => {
    const commits: Array<Record<string, unknown> | null> = [];
    const server = createMdanServer({
      session: {
        async read() {
          return null;
        },
        async commit(mutation, response) {
          commits.push(mutation?.type === "refresh" ? mutation.session as Record<string, unknown> : null);
          response.headers["set-cookie"] = "session=refreshed; Path=/; HttpOnly";
        },
        async clear() {}
      }
    });

    server.page("/session-page", async () => ({
      page: {
        frontmatter: {},
        markdown: "# Session Page",
        blocks: []
      },
      session: {
        type: "refresh",
        session: {
          sid: "s1"
        }
      }
    }));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/session-page",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["set-cookie"]).toContain("session=refreshed");
    expect(commits).toEqual([{ sid: "s1" }]);
  });

  it("does not commit page handler session mutations for rejected html reads", async () => {
    const commits: Array<Record<string, unknown> | null> = [];
    const server = createMdanServer({
      session: {
        async read() {
          return null;
        },
        async commit(mutation, response) {
          commits.push(mutation?.type === "refresh" ? mutation.session as Record<string, unknown> : null);
          response.headers["set-cookie"] = "session=html; Path=/; HttpOnly";
        },
        async clear() {}
      }
    });

    server.page("/session-page-html", async () => ({
      page: {
        frontmatter: {},
        markdown: "# Session Html Page",
        blocks: []
      },
      session: {
        type: "refresh",
        session: {
          sid: "s2"
        }
      }
    }));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/session-page-html",
      headers: {
        accept: "text/html"
      },
      cookies: {}
    });

    expect(response.status).toBe(406);
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(commits).toEqual([]);
  });

  it("commits action handler session mutations on markdown reads", async () => {
    const commits: Array<Record<string, unknown> | null> = [];
    const server = createMdanServer({
      actionProof: { disabled: true },
      session: {
        async read() {
          return null;
        },
        async commit(mutation, response) {
          commits.push(mutation?.type === "refresh" ? mutation.session as Record<string, unknown> : null);
          response.headers["set-cookie"] = "session=action; Path=/; HttpOnly";
        },
        async clear() {}
      }
    });

    server.post("/session-action", async () =>
      ok({
        page: {
          frontmatter: {},
          markdown: "# Action Session Page",
          blocks: []
        },
        session: {
          type: "refresh",
          session: {
            sid: "s3"
          }
        }
      })
    );

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/session-action",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: JSON.stringify({ input: {} }),
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["set-cookie"]).toContain("session=action");
    expect(commits).toEqual([{ sid: "s3" }]);
  });
});
