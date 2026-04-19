import { describe, expect, it } from "vitest";

import { adaptJsonEnvelopeToHeadlessSnapshot, type JsonSurfaceEnvelope } from "../../src/surface/adapter.js";
import { validateActionsContractEnvelope } from "../../src/protocol/contracts.js";
import { createMdanServer, type MdanResponse } from "../../src/server/index.js";

type AgentSurface = JsonSurfaceEnvelope;

function createEnvelope(routePath = "/login", allowedNextActions: string[] = ["login", "open_register"]): AgentSurface {
  return {
    content: `---
app_id: "auth-guestbook"
state_id: "auth-guestbook:login:1"
state_version: 1
---

# Sign In

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
          target: "/register",
          transport: {
            method: "GET"
          },
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
          target: "/auth/login",
          transport: {
            method: "POST"
          },
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
      allowed_next_actions: allowedNextActions
    },
    view: {
      route_path: routePath,
      regions: {
        login: "Sign in with your username and password."
      }
    }
  };
}

function expectAgentSurface(response: MdanResponse): AgentSurface {
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(500);
  expect(response.headers["content-type"]).toBe("application/json");
  expect(typeof response.body).toBe("string");
  return JSON.parse(String(response.body)) as AgentSurface;
}

function expectAction(surface: AgentSurface, id: string) {
  const action = surface.actions.actions?.find((candidate) => candidate.id === id);
  expect(action).toBeTruthy();
  return action!;
}

async function readActionProof(server: ReturnType<typeof createMdanServer>, actionId: string): Promise<string> {
  const response = await server.handle({
    method: "GET",
    url: "https://example.test/login",
    headers: {
      accept: "application/json"
    },
    cookies: {}
  });

  const surface = expectAgentSurface(response);
  const action = expectAction(surface, actionId);
  expect(action.action_proof).toBeTypeOf("string");
  return String(action.action_proof);
}

describe("agent consumption contract", () => {
  it("requires stable state identity fields", () => {
    const envelope = createEnvelope();
    delete envelope.actions.state_id;

    const violations = validateActionsContractEnvelope(envelope);

    expect(violations).toContainEqual({
      path: "actions.state_id",
      message: "state_id is required and must be a non-empty string"
    });
  });

  it("requires stable state version metadata", () => {
    const envelope = createEnvelope();
    delete envelope.actions.state_version;

    const violations = validateActionsContractEnvelope(envelope);

    expect(violations).toContainEqual({
      path: "actions.state_version",
      message: "state_version is required and must be a finite number"
    });
  });

  it("filters blocked actions from the headless agent snapshot", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot(createEnvelope("/login", ["open_register"]));

    expect(snapshot.blocks[0]?.operations.map((operation) => operation.name)).toEqual(["open_register"]);
  });

  it("defaults operation methods from action verbs when transport is omitted", () => {
    const envelope = createEnvelope();
    delete envelope.actions.actions?.[0]?.transport;
    delete envelope.actions.actions?.[1]?.transport;

    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot(envelope);

    expect(snapshot.blocks[0]?.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "open_register", method: "GET" }),
        expect.objectContaining({ name: "login", method: "POST" })
      ])
    );
  });

  it("preserves required input schema metadata", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot(createEnvelope());
    const loginOperation = snapshot.blocks[0]?.operations.find((operation) => operation.name === "login");

    expect(loginOperation?.inputSchema?.required).toEqual(["username", "password"]);
    expect(loginOperation?.inputSchema?.additionalProperties).toBe(false);
    expect(snapshot.blocks[0]?.inputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "username", required: true }),
        expect.objectContaining({ name: "password", required: true, secret: true })
      ])
    );
  });

  it("preserves the semantic current route", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot(createEnvelope("/guestbook"));

    expect(snapshot.route).toBe("/guestbook");
  });

  it("serves page envelopes directly when agents request JSON", async () => {
    const server = createMdanServer();
    server.page("/login", async () => createEnvelope("/login"));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/login",
      headers: {
        accept: "application/json"
      },
      cookies: {}
    });

    const surface = expectAgentSurface(response);
    const loginAction = expectAction(surface, "login");
    expect(surface.view?.route_path).toBe("/login");
    expect(surface.actions.allowed_next_actions).toContain("login");
    expect(loginAction.target).toBe("/auth/login");
    expect(loginAction.transport?.method).toBe("POST");
    expect(loginAction.input_schema?.required).toEqual(["username", "password"]);
  });

  it("serves action result envelopes directly when agents request JSON", async () => {
    const server = createMdanServer();
    server.page("/login", async () => createEnvelope("/login"));
    server.post("/auth/login", async () => createEnvelope("/guestbook"));
    const proof = await readActionProof(server, "login");

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/auth/login",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        action: {
          proof
        },
        input: {
          username: "ada",
          password: "pw"
        }
      }),
      cookies: {}
    });

    const surface = expectAgentSurface(response);
    expect(surface.view?.route_path).toBe("/guestbook");
    expect(surface.actions.state_id).toBe("auth-guestbook:login:1");
  });

  it("does not rewrite action targets in direct JSON responses", async () => {
    const server = createMdanServer();
    const envelope = createEnvelope("/after-action");
    const login = expectAction(envelope, "login");
    login.target = "/custom/action-target";
    server.page("/login", async () => createEnvelope("/login"));
    server.post("/auth/login", async () => envelope);
    const proof = await readActionProof(server, "login");

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/auth/login",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        action: {
          proof
        },
        input: {
          username: "ada",
          password: "pw"
        }
      }),
      cookies: {}
    });

    const surface = expectAgentSurface(response);
    expect(expectAction(surface, "login").target).toBe("/custom/action-target");
    expect(surface.view?.route_path).toBe("/after-action");
  });

  it("serves not-found errors as agent-readable JSON surfaces", async () => {
    const server = createMdanServer();

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/missing",
      headers: {
        accept: "application/json"
      },
      cookies: {}
    });

    const surface = expectAgentSurface(response);
    expect(response.status).toBe(404);
    expect(surface.content).toContain("## Not Found");
    expect(surface.actions.actions).toEqual([]);
    expect(surface.actions.allowed_next_actions).toEqual([]);
    expect(surface.view?.route_path).toBe("/missing");
  });

  it("serves unsupported-media-type errors as agent-readable JSON surfaces", async () => {
    const server = createMdanServer();
    server.post("/submit", async () => createEnvelope("/submitted"));

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/submit",
      headers: {
        accept: "application/json",
        "content-type": "text/plain"
      },
      body: "hello",
      cookies: {}
    });

    const surface = expectAgentSurface(response);
    expect(response.status).toBe(415);
    expect(surface.content).toContain("## Unsupported Media Type");
    expect(surface.actions.actions).toEqual([]);
    expect(surface.actions.allowed_next_actions).toEqual([]);
    expect(surface.view?.route_path).toBe("/submit");
  });

  it("serves invalid-body errors as agent-readable JSON surfaces", async () => {
    const server = createMdanServer();
    server.post("/submit", async () => createEnvelope("/submitted"));

    const response = await server.handle({
      method: "POST",
      url: "https://example.test/submit",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: "{",
      cookies: {}
    });

    const surface = expectAgentSurface(response);
    expect(response.status).toBe(400);
    expect(surface.content).toContain("## Invalid Request Body");
    expect(surface.actions.actions).toEqual([]);
    expect(surface.actions.allowed_next_actions).toEqual([]);
    expect(surface.view?.route_path).toBe("/submit");
  });
});
