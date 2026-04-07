import { composePage } from "@mdanai/sdk/core";
import { describe, expect, it } from "vitest";

import { composePageV2 } from "../../src/core/syntax-v2/index.js";
import { createHostedApp, stream } from "../../src/server/index.js";

describe("createHostedApp", () => {
  it("serves hosted pages composed from v2 syntax through the existing runtime", async () => {
    const messages = ["Welcome"];
    const source = `---
title: Guestbook
---

# Guestbook

<!-- mdan:block guestbook -->

\`\`\`mdan
BLOCK guestbook {
  INPUT message:text required
  GET refresh "/list" LABEL "Refresh"
  POST submit "/post" WITH message LABEL "Submit"
}
\`\`\``;

    function renderPage() {
      return composePageV2(source, {
        blocks: {
          guestbook: `## ${messages.length} live message${messages.length === 1 ? "" : "s"}\n\n${messages
            .map((message) => `- ${message}`)
            .join("\n")}`
        }
      });
    }

    const app = createHostedApp({
      pages: {
        "/guestbook-v2": renderPage
      },
      actions: [
        {
          target: "/list",
          methods: ["GET"],
          routePath: "/guestbook-v2",
          blockName: "guestbook",
          handler: ({ block }) => block()
        },
        {
          target: "/post",
          methods: ["POST"],
          routePath: "/guestbook-v2",
          blockName: "guestbook",
          handler: ({ inputs, block }) => {
            if (inputs.message) {
              messages.push(inputs.message);
            }
            return block();
          }
        }
      ]
    });

    const pageResponse = await app.handle({
      method: "GET",
      url: "https://example.test/guestbook-v2",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(pageResponse.status).toBe(200);
    expect(pageResponse.body).toContain('title: "Guestbook"');
    expect(pageResponse.body).toContain("## 1 live message");
    expect(pageResponse.body).toContain("- Welcome");
    expect(pageResponse.body).toContain('GET refresh "/list" LABEL "Refresh"');
    expect(pageResponse.body).toContain('POST submit "/post" WITH message LABEL "Submit"');
    expect(pageResponse.body).not.toContain('GET "/list" -> refresh');

    const actionResponse = await app.handle({
      method: "POST",
      url: "https://example.test/post",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'message: "Hello"',
      cookies: {}
    });

    expect(actionResponse.status).toBe(200);
    expect(actionResponse.body).toContain("## 2 live messages");
    expect(actionResponse.body).toContain("- Hello");
    expect(actionResponse.body).toContain('POST submit "/post" WITH message LABEL "Submit"');
    expect(actionResponse.body).not.toContain('POST "/post" (message) -> submit');
  });

  it("supports parameterized hosted page routes and action targets", async () => {
    const app = createHostedApp({
      pages: {
        "/surfaces/:surfaceId": ({ params, routePath }) =>
          composePage(
            `# Surface ${params.surfaceId}

<!-- mdan:block runtime -->

\`\`\`mdan
BLOCK runtime {
  INPUT text -> actor_name
  POST "${routePath}/accept" (actor_name) -> accept label:"Accept"
}
\`\`\``,
            {
              blocks: {
                runtime: `## Waiting on ${params.surfaceId}`
              }
            }
          )
      },
      actions: [
        {
          target: "/surfaces/:surfaceId/accept",
          methods: ["POST"],
          routePath: "/surfaces/:surfaceId",
          blockName: "runtime",
          handler: ({ params, block }) => {
            expect(params.surfaceId).toBe("dynamic-task");
            return block();
          }
        }
      ]
    });

    const pageResponse = await app.handle({
      method: "GET",
      url: "https://example.test/surfaces/dynamic-task",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(pageResponse.status).toBe(200);
    expect(pageResponse.body).toContain("# Surface dynamic-task");
    expect(pageResponse.body).toContain('POST "/surfaces/dynamic-task/accept" (actor_name) -> accept');

    const actionResponse = await app.handle({
      method: "POST",
      url: "https://example.test/surfaces/dynamic-task/accept",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'actor_name: "actor-a"',
      cookies: {}
    });

    expect(actionResponse.status).toBe(200);
    expect(actionResponse.body).toContain("## Waiting on dynamic-task");
    expect(actionResponse.body).toContain('POST "/surfaces/dynamic-task/accept" (actor_name) -> accept');
  });

  it("serves pages and block-bound actions from a compact hosted app definition", async () => {
    const messages = ["Welcome"];
    const source = `---
title: Guestbook
---

# Guestbook

<!-- mdan:block guestbook -->

\`\`\`mdan
BLOCK guestbook {
  INPUT text required -> message
  GET "/list" -> refresh label:"Refresh"
  POST "/post" (message) -> submit label:"Submit"
}
\`\`\``;

    function renderPage() {
      return composePage(source, {
        blocks: {
          guestbook: `## ${messages.length} live message${messages.length === 1 ? "" : "s"}\n\n${messages
            .map((message) => `- ${message}`)
            .join("\n")}`
        }
      });
    }

    const app = createHostedApp({
      pages: {
        "/guestbook": renderPage
      },
      actions: [
        {
          target: "/list",
          methods: ["GET"],
          routePath: "/guestbook",
          blockName: "guestbook",
          handler: ({ block }) => block()
        },
        {
          target: "/post",
          methods: ["POST"],
          routePath: "/guestbook",
          blockName: "guestbook",
          handler: ({ inputs, block }) => {
            if (inputs.message) {
              messages.push(inputs.message);
            }
            return block();
          }
        }
      ]
    });

    const pageResponse = await app.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(pageResponse.status).toBe(200);
    expect(pageResponse.body).toContain('title: "Guestbook"');
    expect(pageResponse.body).toContain('GET "/list" -> refresh');

    const actionResponse = await app.handle({
      method: "POST",
      url: "https://example.test/post",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'message: "Hello"',
      cookies: {}
    });

    expect(actionResponse.status).toBe(200);
    expect(actionResponse.body).toContain("## 2 live messages");
    expect(actionResponse.body).toContain("- Hello");
    expect(actionResponse.body).toContain('POST "/post" (message) -> submit');
  });

  it("binds stream GET targets and preserves event-stream behavior", async () => {
    const source = `# Updates

<!-- mdan:block updates -->

\`\`\`mdan
BLOCK updates {
  GET "/stream" accept:"text/event-stream"
}
\`\`\``;

    const app = createHostedApp({
      pages: {
        "/updates": () =>
          composePage(source, {
            blocks: {
              updates: "## Waiting"
            }
          })
      },
      actions: [
        {
          target: "/stream",
          methods: ["GET"],
          routePath: "/updates",
          blockName: "updates",
          handler: () =>
            stream(
              (async function* () {
                yield {
                  markdown: "## Tick",
                  blocks: []
                };
              })()
            )
        }
      ]
    });

    const response = await app.handle({
      method: "GET",
      url: "https://example.test/stream",
      headers: { accept: "text/event-stream" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/event-stream");

    let body = "";
    for await (const chunk of response.body as AsyncIterable<string>) {
      body += chunk;
    }
    expect(body).toContain("data: ## Tick");
  });

  it("registers actions from explicit bindings even when the anonymous page render hides that block", async () => {
    const signedOutSource = `# Sign In`;
    const signedInSource = `# Secret

<!-- mdan:block secure -->

\`\`\`mdan
BLOCK secure {
  INPUT text -> message
  POST "/shared" (message) -> save
}
\`\`\``;

    const app = createHostedApp({
      session: {
        async read(request) {
          return request.cookies.mdan_session ? { userId: "Ada" } : null;
        },
        async commit() {},
        async clear() {}
      },
      pages: {
        "/account": ({ session }) =>
          session
            ? composePage(signedInSource, {
                blocks: {
                  secure: `## Saved for ${session.userId}`
                }
              })
            : composePage(signedOutSource)
      },
      actions: [
        {
          target: "/shared",
          methods: ["POST"],
          routePath: "/account",
          blockName: "secure",
          handler: ({ block }) => block()
        }
      ]
    });

    const response = await app.handle({
      method: "POST",
      url: "https://example.test/shared",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'message: "hi"',
      cookies: {
        mdan_session: "session-1"
      }
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("## Saved for Ada");
    expect(response.body).toContain('POST "/shared" (message) -> save');
  });

  it("uses hosted route context to emit markdown discovery links for html pages and actions", async () => {
    const source = `---
title: Guestbook
---

# Guestbook

<!-- mdan:block guestbook -->

\`\`\`mdan
BLOCK guestbook {
  INPUT text required -> message
  POST "/post" (message) -> submit label:"Submit"
}
\`\`\``;

    const app = createHostedApp({
      htmlDiscovery(context) {
        return {
          markdownHref: `/guides${context.route}.md`,
          llmsTxtHref: "/llms.txt"
        };
      },
      pages: {
        "/guestbook": () =>
          composePage(source, {
            blocks: {
              guestbook: "## 1 live message\n\n- Welcome"
            }
          })
      },
      actions: [
        {
          target: "/post",
          methods: ["POST"],
          routePath: "/guestbook",
          blockName: "guestbook",
          handler: ({ block }) => block()
        }
      ]
    });

    const pageResponse = await app.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(pageResponse.status).toBe(200);
    expect(pageResponse.body).toContain('href="/guides/guestbook.md"');
    expect(pageResponse.body).toContain('rel="llms-txt" href="/llms.txt"');
    expect(pageResponse.headers.link).toContain('</guides/guestbook.md>; rel="alternate"; type="text/markdown"');
    expect(pageResponse.headers.link).toContain('</llms.txt>; rel="llms-txt"');

    const actionResponse = await app.handle({
      method: "POST",
      url: "https://example.test/post",
      headers: {
        accept: "text/html",
        "content-type": "text/markdown"
      },
      body: 'message: "Hello"',
      cookies: {}
    });

    expect(actionResponse.status).toBe(200);
    expect(actionResponse.body).toContain('href="/guides/guestbook.md"');
    expect(actionResponse.headers.link).toContain('</guides/guestbook.md>; rel="alternate"; type="text/markdown"');
  });

  it("rejects duplicate method and target registrations", () => {
    expect(() =>
      createHostedApp({
        pages: {
          "/one": () => composePage("# One"),
          "/two": () => composePage("# Two")
        },
        actions: [
          {
            target: "/shared",
            methods: ["GET"],
            routePath: "/one",
            blockName: "first",
            handler: ({ block }) => block()
          },
          {
            target: "/shared",
            methods: ["GET"],
            routePath: "/two",
            blockName: "second",
            handler: ({ block }) => block()
          }
        ]
      })
    ).toThrow(/must bind to one stable block context/);
  });

  it("rejects invalid explicit action bindings at startup", () => {
    expect(() =>
      createHostedApp({
        pages: {
          "/one": () => composePage("# One")
        },
        actions: [
          {
            target: "/missing",
            methods: ["GET"],
            routePath: "/missing",
            blockName: "guestbook",
            handler: ({ block }) => block()
          }
        ]
      })
    ).toThrow(/Unknown hosted page route "\/missing"/);

    expect(() =>
      createHostedApp({
        pages: {
          "/one": () => composePage("# One")
        },
        actions: [
          {
            target: "/dup",
            methods: ["POST", "POST"],
            routePath: "/one",
            blockName: "guestbook",
            handler: ({ block }) => block()
          }
        ]
      })
    ).toThrow(/cannot declare duplicate methods/);

    expect(() =>
      createHostedApp({
        pages: {
          "/account": () =>
            composePage(`# Account

<!-- mdan:block account -->

\`\`\`mdan
BLOCK account {
  GET "/account" -> refresh
}
\`\`\`
`)
        },
        actions: [
          {
            target: "/account",
            methods: ["GET"],
            routePath: "/account",
            blockName: "account",
            handler: ({ block }) => block()
          }
        ]
      })
    ).toThrow(/GET \/account cannot share the same path as a hosted page route/);
  });
});
