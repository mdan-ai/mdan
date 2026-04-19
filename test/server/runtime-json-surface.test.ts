import { describe, expect, it } from "vitest";

import { adaptJsonEnvelopeToHeadlessSnapshot } from "../../src/surface/adapter.js";
import { createMdanServer } from "../../src/server/index.js";

function createEnvelope(routePath: string, allowedNextActions?: string[]) {
  return {
    content: `---
app_id: "auth-guestbook"
state_id: "auth-guestbook:login:1"
state_version: 1
---

# Sign In

## Login

::: block{id="login" actions="login,open_register" trust="trusted"}
Sign in with your username and password.
:::`,
    actions: {
      app_id: "auth-guestbook",
      state_id: "auth-guestbook:login:1",
      state_version: 1,
      blocks: ["login"],
      actions: [
        {
          id: "open_register",
          label: "Create Account",
          verb: "navigate",
          target: "/auth/register",
          input_schema: {
            type: "object",
            properties: {},
            additionalProperties: false
          }
        },
        {
          id: "login",
          label: "Sign In",
          verb: "write",
          transport: {
            method: "POST"
          },
          target: "/auth/login",
          input_schema: {
            type: "object",
            required: ["username", "password"],
            properties: {
              username: { type: "string" },
              password: { type: "string", format: "password" }
            },
            additionalProperties: false
          }
        }
      ],
      ...(allowedNextActions !== undefined ? { allowed_next_actions: allowedNextActions } : {})
    },
    view: {
      route_path: routePath,
      regions: {
        login: "Sign in with your username and password."
      }
    }
  };
}

describe("createMdanServer JSON surface", () => {
	  it("treats semanticSlots: true as a combined page + block requirement", async () => {
	    const server = createMdanServer({
	      actionProof: { disabled: true },
	      semanticSlots: true
	    });
    server.page("/entry", async () => ({
      ...createEnvelope("/auth/login"),
      content: `# Sign In

## Purpose
Authenticate users.

## Context
Entry page.

## Rules
Use declared actions.

## Result
Guestbook route on success.`,
      view: {
        route_path: "/auth/login",
        regions: {
          login: `## Context
Login form only.`
        }
      }
    }));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/entry",
      headers: { accept: "application/json" },
      cookies: {}
    });

    expect(response.status).toBe(500);
    expect(String(response.body)).toContain("Semantic Slots Violation");
    expect(String(response.body)).toContain("login");
    expect(String(response.body)).toContain("## Result");
  });

	  it("optionally enforces page semantic slots on every returned surface content", async () => {
	    const server = createMdanServer({
	      actionProof: { disabled: true },
	      semanticSlots: {
	        requireOnPage: true
      }
    });
    server.page("/entry", async () => ({
      ...createEnvelope("/auth/login"),
      content: `---
app_id: "auth-guestbook"
state_id: "auth-guestbook:login:1"
state_version: 1
---

# Sign In

::: block{id="login" actions="login,open_register" trust="trusted"}
Sign in with your username and password.
:::`
    }));
    server.post("/auth/login", async () => ({
      ...createEnvelope("/guestbook"),
      content: "# Action response without semantic slots"
    }));

    const pageResponse = await server.handle({
      method: "GET",
      url: "https://example.test/entry",
      headers: { accept: "application/json" },
      cookies: {}
    });

    expect(pageResponse.status).toBe(500);
    expect(String(pageResponse.body)).toContain("Semantic Slots Violation");
    expect(String(pageResponse.body)).toContain('## Purpose');

    const postResponse = await server.handle({
      method: "POST",
      url: "https://example.test/auth/login",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: '{"username":"ada","password":"1234"}',
      cookies: {}
    });

    expect(postResponse.status).toBe(500);
    expect(String(postResponse.body)).toContain("Semantic Slots Violation");
  });

	  it("optionally enforces Context + Result semantic slots on block regions independently from page slots", async () => {
	    const server = createMdanServer({
	      actionProof: { disabled: true },
	      semanticSlots: {
	        requireOnBlock: true
      }
    });
    server.page("/entry", async () => ({
      ...createEnvelope("/auth/login"),
      content: `---
app_id: "auth-guestbook"
state_id: "auth-guestbook:login:1"
state_version: 1
---

# Sign In

## Purpose
Authenticate users.

## Context
Session-less entry page.

## Rules
Require username and password.

## Result
Signed-in session.`,
      view: {
        route_path: "/auth/login",
        regions: {
          login: `## Context
Login form.

Continue with your password.`
        }
      }
    }));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/entry",
      headers: { accept: "application/json" },
      cookies: {}
    });

    expect(response.status).toBe(500);
    expect(String(response.body)).toContain("Semantic Slots Violation");
    expect(String(response.body)).toContain("login");
    expect(String(response.body)).toContain("## Result");
  });

  it("validates agent blocks globally while keeping them out of html output", async () => {
	    const server = createMdanServer({
	      actionProof: { disabled: true },
	      browserShell: {
        title: "Runtime HTML",
        moduleMode: "local-dist"
      }
    });
    server.page("/entry", async () => ({
      ...createEnvelope("/auth/login"),
      content: `# Sign In

Visible copy.

<!-- agent:begin id="planner" -->
## Rules
Use internal planner prompt.
<!-- agent:end -->

::: block{id="login" actions="login,open_register" trust="trusted"}
Sign in with your username and password.
:::`,
      view: {
        route_path: "/auth/login",
        regions: {
          login: `Visible login block.

<!-- agent:begin id="block-planner" -->
## Result
Hidden block prompt.
<!-- agent:end -->`
        }
      }
    }));

    const htmlResponse = await server.handle({
      method: "GET",
      url: "https://example.test/entry",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(htmlResponse.status).toBe(200);
    expect(String(htmlResponse.body)).toContain("Visible copy.");
    expect(String(htmlResponse.body)).toContain("Visible login block.");
    expect(String(htmlResponse.body)).not.toContain("<p>Use internal planner prompt.</p>");
    expect(String(htmlResponse.body)).not.toContain("<p>Hidden block prompt.</p>");

    server.post("/auth/login", async () => ({
      ...createEnvelope("/guestbook"),
      content: `# Broken

<!-- agent:begin id="broken" -->
Missing closing marker`
    }));

    const postResponse = await server.handle({
      method: "POST",
      url: "https://example.test/auth/login",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: '{"username":"ada","password":"1234"}',
      cookies: {}
    });

    expect(postResponse.status).toBe(500);
    expect(String(postResponse.body)).toContain("Agent Blocks Violation");
  });

	  it("accepts page handlers that return JSON surface envelopes", async () => {
	    const server = createMdanServer({ actionProof: { disabled: true } });
    server.page("/entry", async () => createEnvelope("/auth/login"));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/entry",
      headers: { accept: "application/json" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("application/json");
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot(JSON.parse(String(response.body)));
    expect(snapshot.route).toBe("/auth/login");
    expect(snapshot.blocks[0]?.name).toBe("login");
    expect(snapshot.blocks[0]?.operations).toHaveLength(2);
    expect(snapshot.blocks[0]?.operations.map((operation) => operation.target)).toContain("/auth/register");
    expect(snapshot.blocks[0]?.operations.map((operation) => operation.target)).toContain("/auth/login");
  });

  it("renders html pages directly from JSON surface page handlers", async () => {
	    const server = createMdanServer({
	      actionProof: { disabled: true },
	      browserShell: {
        title: "Runtime HTML",
        moduleMode: "local-dist"
      }
    });
    server.page("/entry", async () => createEnvelope("/auth/login"));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/entry",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/html");
    expect(String(response.body)).toContain("<!doctype html>");
    expect(String(response.body)).toContain("<h1>Sign In</h1>");
    expect(String(response.body)).toContain('"/__mdan/surface.js"');
    expect(String(response.body)).toContain('id="mdan-initial-surface"');
  });

	  it("returns json for action handlers that return JSON surface envelopes", async () => {
	    const server = createMdanServer({ actionProof: { disabled: true } });
    server.post("/auth/login", async () => createEnvelope("/guestbook"));

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/auth/login",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: '{"username":"ada","password":"1234"}',
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(String(response.body))).toMatchObject({
      content: expect.stringContaining("# Sign In"),
      view: {
        route_path: "/guestbook"
      }
    });
  });

	  it("rejects markdown for action handlers so block updates stay json-only", async () => {
	    const server = createMdanServer({ actionProof: { disabled: true } });
    server.post("/auth/login", async () => createEnvelope("/guestbook"));

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/auth/login",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: '{"username":"ada","password":"1234"}',
      cookies: {}
    });

    expect(response.status).toBe(406);
    expect(response.headers["content-type"]).toContain("text/markdown");
    expect(String(response.body)).toContain("application/json");
  });

	  it("rejects event-stream requests for non-stream action handlers without throwing", async () => {
	    const server = createMdanServer({ actionProof: { disabled: true } });
    server.post("/auth/login", async () => createEnvelope("/guestbook"));

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/auth/login",
      headers: {
        accept: "text/event-stream",
        "content-type": "application/json"
      },
      body: '{"username":"ada","password":"1234"}',
      cookies: {}
    });

    expect(response.status).toBe(406);
    expect(response.headers["content-type"]).toBe('text/markdown; profile="https://mdan.ai/spec/v1"');
    expect(String(response.body)).toContain("Not Acceptable");
    expect(String(response.body)).toContain("text/event-stream");
  });

	  it("filters blocked actions from json snapshots using allowed_next_actions", async () => {
	    const server = createMdanServer({ actionProof: { disabled: true } });
    server.page("/entry", async () => createEnvelope("/auth/login", ["open_register"]));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/entry",
      headers: { accept: "application/json" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot(JSON.parse(String(response.body)));
    expect(snapshot.blocks[0]?.operations).toEqual([
      {
        method: "GET",
        target: "/auth/register",
        name: "open_register",
        inputs: [],
        label: "Create Account",
        verb: "navigate",
        security: { confirmationPolicy: "never" },
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      }
    ]);
  });

	  it("renders no operations when allowed_next_actions is explicitly empty", async () => {
	    const server = createMdanServer({ actionProof: { disabled: true } });
    server.page("/entry", async () => createEnvelope("/auth/login", []));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/entry",
      headers: { accept: "application/json" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot(JSON.parse(String(response.body)));
    expect(snapshot.blocks[0]?.operations).toEqual([]);
  });
});
