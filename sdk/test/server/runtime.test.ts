import { describe, expect, it, vi } from "vitest";

import { composePage } from "../../src/core/index.js";
import { createMdanServer, ok, signIn, stream } from "../../src/server/index.js";

async function readBody(body: string | AsyncIterable<string>): Promise<string> {
  if (typeof body === "string") {
    return body;
  }

  let result = "";
  for await (const chunk of body) {
    result += chunk;
  }
  return result;
}

describe("createMdanServer", () => {
  it("returns a single server-sent event when event-stream is requested for a regular fragment", async () => {
    const server = createMdanServer();

    server.get("/updates", async () =>
      ok({
        fragment: {
          markdown: "## Updated",
          blocks: []
        }
      })
    );

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/updates",
      headers: { accept: "text/event-stream" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/event-stream");
    const body = await readBody(response.body);
    expect(body).toContain("data: ## Updated");
  });

  it("streams multiple fragment updates when a handler returns an event stream", async () => {
    const server = createMdanServer();

    server.get("/updates", async () =>
      stream(
        (async function* () {
          yield {
            markdown: "## First",
            blocks: []
          };
          yield {
            markdown: "## Second",
            blocks: []
          };
        })()
      )
    );

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/updates",
      headers: { accept: "text/event-stream" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/event-stream");
    const body = await readBody(response.body);
    expect(body).toContain("data: ## First");
    expect(body).toContain("data: ## Second");
  });

  it("matches GET handlers by target and returns markdown", async () => {
    const server = createMdanServer();

    server.get("/list", async (ctx) =>
      ok({
        fragment: {
          markdown: `## Hi ${ctx.inputs.name ?? "friend"}`,
          blocks: []
        }
      })
    );

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/list?name=Guest",
      headers: { accept: "text/markdown" },
      query: {},
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe(
      'text/markdown; profile="https://mdan.ai/protocol/v1"'
    );
    expect(response.body).toContain("## Hi Guest");
  });

  it("uses the last repeated query value when parsing GET inputs", async () => {
    const server = createMdanServer();

    server.get("/search", async (ctx) =>
      ok({
        fragment: {
          markdown: `## Query ${ctx.inputs.query ?? "none"}`,
          blocks: []
        }
      })
    );

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/search?query=first&query=second",
      headers: { accept: "text/markdown" },
      query: {},
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("## Query second");
  });

  it("matches POST handlers by target, parses markdown body, and commits session", async () => {
    const commit = vi.fn(async () => undefined);
    const server = createMdanServer({
      session: {
        read: async () => null,
        commit,
        clear: async () => undefined
      }
    });

    server.post("/login", async (ctx) =>
      ok({
        fragment: {
          markdown: `# Welcome ${ctx.inputs.nickname}`,
          blocks: []
        },
        session: signIn({ userId: "user-1" })
      })
    );

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/login",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: `nickname: "Guest"`,
      query: {},
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe(
      'text/markdown; profile="https://mdan.ai/protocol/v1"'
    );
    expect(response.body).toContain("# Welcome Guest");
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("returns 415 for unsupported POST content types", async () => {
    const server = createMdanServer();

    server.post("/login", async () =>
      ok({
        fragment: {
          markdown: "# Should not run",
          blocks: []
        }
      })
    );

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/login",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: `{"nickname":"Guest"}`,
      cookies: {}
    });

    expect(response.status).toBe(415);
    expect(response.headers["content-type"]).toBe(
      'text/markdown; profile="https://mdan.ai/protocol/v1"'
    );
    expect(response.body).toContain("Unsupported Media Type");
  });

  it("passes the current session into sessionProvider.clear during sign-out", async () => {
    const clear = vi.fn(async () => undefined);
    const server = createMdanServer({
      session: {
        read: async () => ({ sessionId: "s1", userId: "ada" }),
        commit: async () => undefined,
        clear
      }
    });

    server.post("/logout", async () =>
      ok({
        fragment: {
          markdown: "## Signed out",
          blocks: []
        },
        session: { type: "sign-out" }
      })
    );

    await server.handle({
      method: "POST",
      url: "https://example.test/logout",
      headers: {
        accept: "text/markdown"
      },
      cookies: {
        mdan_session: "s1"
      }
    });

    expect(clear).toHaveBeenCalledWith(
      { sessionId: "s1", userId: "ada" },
      expect.objectContaining({ status: 200 }),
      expect.objectContaining({ url: "https://example.test/logout" })
    );
  });

  it("commits the final session mutation after an action auto-resolves into a page", async () => {
    const commit = vi.fn(async () => undefined);
    const server = createMdanServer({
      session: {
        read: async () => null,
        commit,
        clear: async () => undefined
      }
    });

    server.post("/start", async () =>
      ok({
        fragment: {
          markdown: "## Starting",
          blocks: [
            {
              name: "session",
              markdown: "## Starting",
              inputs: [],
              operations: [{ method: "GET", target: "/finish", name: "finish", inputs: [], auto: true }]
            }
          ]
        },
        session: signIn({ userId: "draft-user" })
      })
    );

    server.get("/finish", async () =>
      ok({
        page: composePage("# Final", {}),
        session: signIn({ userId: "final-user" })
      })
    );

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/start",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("# Final");
    expect(commit).toHaveBeenCalledWith(
      {
        type: "sign-in",
        session: { userId: "final-user" }
      },
      expect.objectContaining({ status: 200 })
    );
  });

  it("commits the deepest session mutation when an action resolves through multiple auto page steps", async () => {
    const commit = vi.fn(async () => undefined);
    const server = createMdanServer({
      session: {
        read: async () => null,
        commit,
        clear: async () => undefined
      }
    });

    server.post("/start", async () =>
      ok({
        fragment: {
          markdown: "## Starting",
          blocks: [
            {
              name: "session",
              markdown: "## Starting",
              inputs: [],
              operations: [{ method: "GET", target: "/step-1", name: "step_1", inputs: [], auto: true }]
            }
          ]
        },
        session: signIn({ userId: "draft-user" })
      })
    );

    server.get("/step-1", async () =>
      ok({
        page: composePage(
          `# Step 1

<!-- mdan:block gate -->

\`\`\`mdan
BLOCK gate {
  GET "/step-2" -> step_2 auto
}
\`\`\`
`,
          {
            blocks: {
              gate: "## Passing through"
            }
          }
        ),
        session: signIn({ userId: "middle-user" })
      })
    );

    server.get("/step-2", async () =>
      ok({
        page: composePage("# Final", {}),
        session: signIn({ userId: "final-user" })
      })
    );

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/start",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("# Final");
    expect(commit).toHaveBeenCalledWith(
      {
        type: "sign-in",
        session: { userId: "final-user" }
      },
      expect.objectContaining({ status: 200 })
    );
  });

  it("commits session mutations produced by auto resolution on page routes", async () => {
    const commit = vi.fn(async () => undefined);
    const server = createMdanServer({
      session: {
        read: async () => null,
        commit,
        clear: async () => undefined
      }
    });

    server.page("/welcome", async () =>
      composePage(
        `# Welcome

<!-- mdan:block auth -->

\`\`\`mdan
BLOCK auth {
  GET "/bootstrap-session" -> bootstrap_session auto
}
\`\`\`
`,
        {
          blocks: {
            auth: "## Loading session"
          }
        }
      )
    );

    server.get("/bootstrap-session", async () =>
      ok({
        page: composePage("# Ready", {}),
        session: signIn({ userId: "page-user" })
      })
    );

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/welcome",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("# Ready");
    expect(commit).toHaveBeenCalledWith(
      {
        type: "sign-in",
        session: { userId: "page-user" }
      },
      expect.objectContaining({ status: 200 })
    );
  });

  it("uses the resolved page route when a page route auto-navigates to another page", async () => {
    const server = createMdanServer();

    server.page("/vault", async () =>
      composePage(
        `# Vault

<!-- mdan:block gate -->

\`\`\`mdan
BLOCK gate {
  GET "/login" -> open_login auto
}
\`\`\`
`,
        {
          blocks: {
            gate: "## Checking access"
          }
        }
      )
    );

    server.page("/login", async () => composePage("# Login", {}));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/vault",
      headers: {
        accept: "text/html"
      },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/html");
    expect(response.body).toContain('"route":"/login"');
    expect(response.body).toContain("# Login");
  });

  it("clears the current session when page-route auto resolution signs out", async () => {
    const clear = vi.fn(async () => undefined);
    const server = createMdanServer({
      session: {
        read: async () => ({ sessionId: "s1", userId: "ada" }),
        commit: async () => undefined,
        clear
      }
    });

    server.page("/vault", async () =>
      composePage(
        `# Vault

<!-- mdan:block gate -->

\`\`\`mdan
BLOCK gate {
  GET "/logout-bootstrap" -> logout_bootstrap auto
}
\`\`\`
`,
        {
          blocks: {
            gate: "## Closing session"
          }
        }
      )
    );

    server.get("/logout-bootstrap", async () =>
      ok({
        page: composePage("# Signed Out", {}),
        session: { type: "sign-out" }
      })
    );

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/vault",
      headers: {
        accept: "text/markdown"
      },
      cookies: {
        mdan_session: "s1"
      }
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("# Signed Out");
    expect(clear).toHaveBeenCalledWith(
      { sessionId: "s1", userId: "ada" },
      expect.objectContaining({ status: 200 }),
      expect.objectContaining({ url: "https://example.test/vault" })
    );
  });

  it("keeps the current page when an auto dependency target is missing", async () => {
    const server = createMdanServer();

    server.page("/vault", async () =>
      composePage(
        `# Vault

<!-- mdan:block gate -->

\`\`\`mdan
BLOCK gate {
  GET "/missing" -> missing auto
}
\`\`\`
`,
        {
          blocks: {
            gate: "## Still here"
          }
        }
      )
    );

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/vault",
      headers: {
        accept: "text/html"
      },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain('"route":"/vault"');
    expect(response.body).toContain("Still here");
    expect(response.body).not.toContain("# Login");
  });

  it("stops auto resolution after 10 passes instead of looping forever", async () => {
    const server = createMdanServer();
    const loop = vi.fn(async () =>
      ok({
        fragment: {
          markdown: "## Looping",
          blocks: [
            {
              name: "gate",
              markdown: "## Looping",
              inputs: [],
              operations: [{ method: "GET", target: "/loop-step", name: "loop_step", inputs: [], auto: true }]
            }
          ]
        }
      })
    );

    server.page("/loop", async () =>
      composePage(
        `# Loop

<!-- mdan:block gate -->

\`\`\`mdan
BLOCK gate {
  GET "/loop-step" -> loop_step auto
}
\`\`\`
`,
        {
          blocks: {
            gate: "## Start"
          }
        }
      )
    );

    server.get("/loop-step", loop);

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/loop",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(loop).toHaveBeenCalledTimes(10);
    expect(response.body).toContain("GET \"/loop-step\" -> loop_step auto");
    expect(response.body).toContain("## Looping");
  });

  it("allows empty POST actions without an explicit content type", async () => {
    const server = createMdanServer();

    server.post("/logout", async () =>
      ok({
        fragment: {
          markdown: "## Signed out",
          blocks: []
        }
      })
    );

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/logout",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("Signed out");
  });

  it("returns a recoverable fragment for malformed markdown bodies instead of throwing", async () => {
    const server = createMdanServer();

    server.post("/login", async () =>
      ok({
        fragment: {
          markdown: "# Should not run",
          blocks: []
        }
      })
    );

    await expect(
      server.handle({
        method: "POST",
        url: "https://example.test/login",
        headers: {
          accept: "text/markdown",
          "content-type": "text/markdown"
        },
        body: `nickname=Guest`,
        cookies: {}
      })
    ).resolves.toMatchObject({
      status: 400,
      headers: {
        "content-type": 'text/markdown; profile="https://mdan.ai/protocol/v1"'
      }
    });
  });

  it("returns a recoverable 500 fragment when an action handler throws", async () => {
    const server = createMdanServer();

    server.post("/boom", async () => {
      throw new Error("boom");
    });

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/boom",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: `message: "hi"`,
      cookies: {}
    });

    expect(response.status).toBe(500);
    expect(response.headers["content-type"]).toBe(
      'text/markdown; profile="https://mdan.ai/protocol/v1"'
    );
    expect(response.body).toContain("Internal Server Error");
  });

  it("returns a recoverable 500 fragment when session persistence throws", async () => {
    const server = createMdanServer({
      session: {
        read: async () => null,
        commit: async () => {
          throw new Error("commit failed");
        },
        clear: async () => undefined
      }
    });

    server.post("/login", async () =>
      ok({
        fragment: {
          markdown: "## Welcome",
          blocks: []
        },
        session: signIn({ userId: "user-1" })
      })
    );

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/login",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: `nickname: "Guest"`,
      cookies: {}
    });

    expect(response.status).toBe(500);
    expect(response.headers["content-type"]).toBe(
      'text/markdown; profile="https://mdan.ai/protocol/v1"'
    );
    expect(response.body).toContain("Internal Server Error");
  });

  it("returns html when the client prefers html", async () => {
    const server = createMdanServer();

    server.get("/list", async () =>
      ok({
        fragment: {
          markdown: "# Demo",
          blocks: []
        }
      })
    );

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/list",
      headers: { accept: "text/html" },
      query: {},
      cookies: {}
    });

    expect(response.headers["content-type"]).toBe("text/html");
    expect(response.body).toContain("<main");
  });

  it("passes an injected markdown renderer through the html response path", async () => {
    const server = createMdanServer({
      markdownRenderer: {
        render(markdown) {
          return `<section data-renderer="custom">${markdown.toUpperCase()}</section>`;
        }
      }
    });

    server.get("/list", async () =>
      ok({
        fragment: {
          markdown: "# Demo",
          blocks: []
        }
      })
    );

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/list",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.headers["content-type"]).toBe("text/html");
    expect(response.body).toContain('data-renderer="custom"');
    expect(response.body).toContain("DEMO");
  });

  it("injects discovery links into custom html shells when htmlDiscovery is configured", async () => {
    const renderHtml = vi.fn((fragment, options) => {
      expect(options.protocol?.discovery).toEqual({
        markdownHref: "/list",
        llmsTxtHref: "/llms.txt"
      });

      return `<!doctype html><html lang="en"><head><title>Custom Shell</title></head><body><main>${fragment.markdown}</main></body></html>`;
    });

    const server = createMdanServer({
      htmlDiscovery: {
        markdownHref: "/list",
        llmsTxtHref: "/llms.txt"
      },
      renderHtml
    });

    server.get("/list", async () =>
      ok({
        fragment: {
          markdown: "# Demo",
          blocks: []
        }
      })
    );

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/list",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.headers["content-type"]).toBe("text/html");
    expect(response.body).toContain('<link rel="alternate" type="text/markdown" href="/list">');
    expect(response.body).toContain('<link rel="llms-txt" href="/llms.txt">');
    expect(response.body).toContain("<title>Custom Shell</title>");
    expect(renderHtml).toHaveBeenCalledTimes(1);
  });

  it("returns markdown when accept explicitly includes text/markdown alongside html", async () => {
    const server = createMdanServer();

    server.get("/list", async () =>
      ok({
        fragment: {
          markdown: "# Demo",
          blocks: []
        }
      })
    );

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/list",
      headers: { accept: "text/html, text/markdown" },
      cookies: {}
    });

    expect(response.headers["content-type"]).toBe(
      'text/markdown; profile="https://mdan.ai/protocol/v1"'
    );
    expect(response.body).toContain("# Demo");
  });

  it("returns 404 when no handler matches", async () => {
    const server = createMdanServer();

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/missing",
      headers: { accept: "text/markdown" },
      query: {},
      cookies: {}
    });

    expect(response.status).toBe(404);
    expect(response.body).toContain("Not Found");
  });

  it("returns 406 for unsupported accept headers", async () => {
    const server = createMdanServer();

    server.get("/list", async () =>
      ok({
        fragment: {
          markdown: "# Demo",
          blocks: []
        }
      })
    );

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/list",
      headers: { accept: "application/json" },
      query: {},
      cookies: {}
    });

    expect(response.status).toBe(406);
  });

  it("serves canonical page markdown to agent consumers", async () => {
    const server = createMdanServer();

    server.page("/guestbook", async () => ({
      frontmatter: { title: "Guestbook" },
      markdown: "# Guestbook\n\n<!-- mdan:block guestbook -->",
      blockContent: {
        guestbook: "## 2 live messages\n\n- Welcome\n- Hello"
      },
      blocks: [
        {
          name: "guestbook",
          inputs: [{ name: "message", type: "text", required: true, secret: false }],
          operations: [{ method: "POST", target: "/post", name: "submit", inputs: ["message"], label: "Submit" }]
        }
      ],
      blockAnchors: ["guestbook"]
    }));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe(
      'text/markdown; profile="https://mdan.ai/protocol/v1"'
    );
    expect(response.body).toContain('title: "Guestbook"');
    expect(response.body).toContain("## 2 live messages");
    expect(response.body).toContain("- Hello");
    expect(response.body).toContain("```mdan");
    expect(response.body).toContain('POST "/post" (message) -> submit');
  });

  it("serves rendered html to browser consumers for page routes", async () => {
    const server = createMdanServer();

    server.page("/guestbook", async () => ({
      frontmatter: { title: "Guestbook" },
      markdown: "# Guestbook\n\n<!-- mdan:block guestbook -->",
      blockContent: {
        guestbook: "## 2 live messages\n\n- Welcome\n- Hello"
      },
      blocks: [
        {
          name: "guestbook",
          inputs: [{ name: "message", type: "text", required: true, secret: false }],
          operations: [{ method: "POST", target: "/post", name: "submit", inputs: ["message"], label: "Submit" }]
        }
      ],
      blockAnchors: ["guestbook"]
    }));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/html");
    expect(response.body).toContain("<!doctype html>");
    expect(response.body).toContain("Guestbook");
    expect(response.body).toContain("2 live messages");
    expect(response.body).toContain("<li>Hello</li>");
  });

  it("auto-resolves explicit auto GET block dependencies for html page responses", async () => {
    const server = createMdanServer();
    const listHandler = vi.fn(async () =>
      ok({
        fragment: {
          markdown: "## 2 live messages\n\n- Welcome\n- Hello",
          blocks: [
            {
              name: "guestbook",
              inputs: [],
              operations: []
            }
          ]
        }
      })
    );

    server.page("/guestbook", async () => ({
      frontmatter: { title: "Guestbook" },
      markdown: "# Guestbook\n\n<!-- mdan:block guestbook -->",
      blocks: [
        {
          name: "guestbook",
          inputs: [],
          operations: [{ method: "GET", target: "/list", name: "load_messages", inputs: [], auto: true }]
        }
      ],
      blockAnchors: ["guestbook"]
    }));

    server.get("/list", listHandler);

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/html");
    expect(listHandler).toHaveBeenCalledTimes(1);
    expect(response.body).toContain("2 live messages");
    expect(response.body).not.toContain('action="/list"');
  });

  it("auto-resolves explicit auto GET block dependencies in markdown page responses", async () => {
    const server = createMdanServer();
    const listHandler = vi.fn(async () =>
      ok({
        fragment: {
          markdown: "## 2 live messages",
          blocks: [
            {
              name: "guestbook",
              inputs: [],
              operations: []
            }
          ]
        }
      })
    );

    server.page("/guestbook", async () => ({
      frontmatter: { title: "Guestbook" },
      markdown: "# Guestbook\n\n<!-- mdan:block guestbook -->",
      blocks: [
        {
          name: "guestbook",
          inputs: [],
          operations: [{ method: "GET", target: "/list", name: "load_messages", inputs: [], auto: true }]
        }
      ],
      blockAnchors: ["guestbook"]
    }));

    server.get("/list", listHandler);

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe('text/markdown; profile="https://mdan.ai/protocol/v1"');
    expect(listHandler).toHaveBeenCalledTimes(1);
    expect(response.body).toContain("2 live messages");
    expect(response.body).not.toContain('GET "/list" -> load_messages auto');
  });

  it("does not auto-resolve manual labeled GET operations for html page responses", async () => {
    const server = createMdanServer();
    const listHandler = vi.fn(async () =>
      ok({
        fragment: {
          markdown: "## 2 live messages",
          blocks: [
            {
              name: "guestbook",
              inputs: [],
              operations: []
            }
          ]
        }
      })
    );

    server.page("/guestbook", async () => ({
      frontmatter: { title: "Guestbook" },
      markdown: "# Guestbook\n\n<!-- mdan:block guestbook -->",
      blocks: [
        {
          name: "guestbook",
          inputs: [],
          operations: [{ method: "GET", target: "/list", name: "refresh", inputs: [], label: "Refresh" }]
        }
      ],
      blockAnchors: ["guestbook"]
    }));

    server.get("/list", listHandler);

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(listHandler).not.toHaveBeenCalled();
    expect(response.body).toContain('action="/list"');
    expect(response.body).toContain("Refresh");
  });

  it("auto-resolves explicit auto GET dependencies for html fragment responses", async () => {
    const server = createMdanServer();

    server.page("/vault", async () => ({
      frontmatter: { title: "Vault" },
      markdown: "# Vault\n\n<!-- mdan:block vault -->",
      blockContent: {
        vault: "## 0 saved notes\n\n- No private notes yet"
      },
      blocks: [
        {
          name: "vault",
          inputs: [{ name: "message", type: "text", required: true, secret: false }],
          operations: [{ method: "POST", target: "/vault", name: "save", inputs: ["message"], label: "Save Note" }]
        }
      ],
      blockAnchors: ["vault"]
    }));

    server.post("/login", async () =>
      ok({
        fragment: {
          markdown: "## Welcome Ada\n\nUse `open_vault` to continue.",
          blocks: [
            {
              name: "login",
              inputs: [],
              operations: [{ method: "GET", target: "/vault", name: "open_vault", inputs: [], auto: true }]
            }
          ]
        }
      })
    );

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/login",
      headers: {
        accept: "text/html",
        "content-type": "text/markdown"
      },
      body: 'nickname: "Ada"',
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/html");
    expect(response.body).toContain("# Vault");
    expect(response.body).toContain("No private notes yet");
    expect(response.body).toContain('action="/vault"');
    expect(response.body).not.toContain("Use `open_vault` to continue.");
    expect(response.body).not.toContain('GET "/vault" -> open_vault');
  });

  it("propagates session mutations from implicit html GET dependencies to later implicit steps", async () => {
    const server = createMdanServer();
    const sessionAfterLogin = signIn({ userId: "Ada" });

    server.page("/vault", async ({ session }) =>
      session
        ? {
            frontmatter: { title: "Vault" },
            markdown: "# Vault\n\n<!-- mdan:block vault -->",
            blockContent: {
              vault: "## Welcome Ada"
            },
            blocks: [
              {
                name: "vault",
                inputs: [],
                operations: []
              }
            ],
            blockAnchors: ["vault"]
          }
        : {
            frontmatter: { title: "Vault" },
            markdown: "# Vault\n\n<!-- mdan:block vault -->",
            blockContent: {
              vault: "## Please sign in"
            },
            blocks: [
              {
                name: "vault",
                inputs: [],
                operations: []
              }
            ],
            blockAnchors: ["vault"]
          }
    );

    server.post("/login", async () =>
      ok({
        fragment: {
          markdown: "## Starting login",
          blocks: [
            {
              name: "login",
              inputs: [],
              operations: [{ method: "GET", target: "/session-ready", name: "continue_login", inputs: [], auto: true }]
            }
          ]
        }
      })
    );

    server.get("/session-ready", async ({ session }) =>
      ok({
        fragment: {
          markdown: session ? "## Session already ready" : "## Session ready now",
          blocks: [
            {
              name: "login",
              inputs: [],
              operations: [{ method: "GET", target: "/vault", name: "open_vault", inputs: [], auto: true }]
            }
          ]
        },
        session: sessionAfterLogin
      })
    );

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/login",
      headers: {
        accept: "text/html",
        "content-type": "text/markdown"
      },
      body: 'nickname: "Ada"',
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("Welcome Ada");
    expect(response.body).not.toContain("Please sign in");
    expect(response.body).not.toContain("Session ready now");
  });

  it("auto-resolves explicit auto GET dependencies in markdown fragment responses", async () => {
    const server = createMdanServer();

    server.page("/vault", async () => ({
      frontmatter: { title: "Vault" },
      markdown: "# Vault",
      blocks: [],
      blockAnchors: []
    }));

    server.post("/login", async () =>
      ok({
        fragment: {
          markdown: "## Welcome Ada\n\nUse `open_vault` to continue.",
          blocks: [
            {
              name: "login",
              inputs: [],
              operations: [{ method: "GET", target: "/vault", name: "open_vault", inputs: [], auto: true }]
            }
          ]
        }
      })
    );

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/login",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'nickname: "Ada"',
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe('text/markdown; profile="https://mdan.ai/protocol/v1"');
    expect(response.body).toContain("# Vault");
    expect(response.body).not.toContain('GET "/vault" -> open_vault auto');
    expect(response.body).not.toContain("Welcome Ada");
  });

  it("rejects event-stream negotiation on page routes", async () => {
    const server = createMdanServer();

    server.page("/guestbook", async () => ({
      frontmatter: { title: "Guestbook" },
      markdown: "# Guestbook",
      blocks: [],
      blockAnchors: []
    }));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: { accept: "text/event-stream" },
      cookies: {}
    });

    expect(response.status).toBe(406);
    expect(response.headers["content-type"]).toBe(
      'text/markdown; profile="https://mdan.ai/protocol/v1"'
    );
    await expect(readBody(response.body)).resolves.toContain("Page routes do not support text/event-stream");
  });

  it("returns a recoverable 500 fragment when a page handler throws", async () => {
    const server = createMdanServer();

    server.page("/boom", async () => {
      throw new Error("boom");
    });

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/boom",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(response.status).toBe(500);
    expect(response.headers["content-type"]).toBe(
      'text/markdown; profile="https://mdan.ai/protocol/v1"'
    );
    await expect(readBody(response.body)).resolves.toContain("Internal Server Error");
  });
});
