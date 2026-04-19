import { describe, expect, it } from "vitest";

import { createMdanServer } from "../../src/server/index.js";
import { adaptJsonEnvelopeToHeadlessSnapshot } from "../../src/surface/adapter.js";

type TestServer = ReturnType<typeof createMdanServer>;

function createEnvelope() {
  return {
    content: `# Demo

::: block{id="editor" actions="createResource"}
Create resource.
:::`,
    actions: {
      app_id: "runtime-action-proof",
      state_id: "runtime-action-proof:demo",
      state_version: 1,
      blocks: ["editor"],
      actions: [
        {
          id: "createResource",
          label: "Create",
          verb: "write",
          transport: { method: "POST" },
          target: "/resources",
          input_schema: {
            type: "object",
            required: ["title"],
            properties: {
              title: { type: "string" }
            }
          }
        }
      ],
      allowed_next_actions: ["createResource"]
    },
    view: {
      route_path: "/demo",
      regions: {
        editor: "Create resource."
      }
    }
  };
}

function createEnvelopeWithConfirmationPolicy(policy: "never" | "always" | "high-and-above") {
  return {
    ...createEnvelope(),
    actions: {
      ...createEnvelope().actions,
      security: {
        default_confirmation_policy: policy
      }
    }
  };
}

function createEnvelopeWithActionSemantics(options: {
  policy?: "never" | "always" | "high-and-above";
  riskLevel?: "low" | "medium" | "high" | "critical";
}) {
  const base = createEnvelope();
  const action = base.actions.actions?.[0];
  return {
    ...base,
    actions: {
      ...base.actions,
      ...(options.policy
        ? {
            security: {
              default_confirmation_policy: options.policy
            }
          }
        : {}),
      actions: action
        ? [
            {
              ...action,
              ...(options.riskLevel
                ? {
                    guard: {
                      risk_level: options.riskLevel
                    }
                  }
                : {})
            }
          ]
        : []
    }
  };
}

function readJsonOperation(payload: string) {
  const envelope = JSON.parse(payload);
  return envelope.actions?.actions?.[0] as Record<string, unknown>;
}

function readHeadlessOperation(payload: string) {
  return adaptJsonEnvelopeToHeadlessSnapshot(JSON.parse(payload)).blocks[0]?.operations[0];
}

async function handleJsonGet(server: TestServer, path: string) {
  return server.handle({
    method: "GET",
    url: `https://example.test${path}`,
    headers: { accept: "application/json" },
    cookies: {}
  });
}

async function handleJsonPost(server: TestServer, path: string, body: string | Record<string, unknown>) {
  return server.handle({
    method: "POST",
    url: `https://example.test${path}`,
    headers: {
      accept: "application/json",
      "content-type": "application/json"
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
    cookies: {}
  });
}

async function readEntryOperation(server: TestServer, path = "/entry") {
  return readHeadlessOperation(String((await handleJsonGet(server, path)).body));
}

describe("runtime action proof", () => {
  it("issues and requires action proof by default", async () => {
    const server = createMdanServer();
    server.page("/entry", async () => createEnvelope());
    server.post("/resources", async ({ inputs }) => ({
      ...createEnvelope(),
      view: {
        ...createEnvelope().view,
        regions: { editor: `Created: ${inputs.title}` }
      }
    }));

    const operation = await readEntryOperation(server);

    expect(operation?.actionProof).toBeTypeOf("string");
    expect(operation?.submitFormat).toBe("mdan-action-input-v1");

    const bareResponse = await handleJsonPost(server, "/resources", {
      input: {
        title: "Doc"
      }
    });

    expect(bareResponse.status).toBe(400);
    expect(String(bareResponse.body)).toContain("Invalid Action Request Format");

    const proofResponse = await handleJsonPost(server, "/resources", {
      action: {
        proof: String(operation?.actionProof)
      },
      input: {
        title: "Doc"
      }
    });

    expect(proofResponse.status).toBe(200);
    expect(String(proofResponse.body)).toContain("Created: Doc");
  });

  it("allows hosts to explicitly disable action proof", async () => {
    const server = createMdanServer({
      actionProof: { disabled: true }
    });
    server.page("/entry", async () => createEnvelope());
    server.post("/resources", async ({ inputs }) => ({
      ...createEnvelope(),
      view: {
        ...createEnvelope().view,
        regions: { editor: `Created: ${inputs.title}` }
      }
    }));

    const operation = await readEntryOperation(server);

    expect(operation?.actionProof).toBeUndefined();
    expect(operation?.submitFormat).toBeUndefined();

    const response = await handleJsonPost(server, "/resources", {
      input: {
        title: "Doc"
      }
    });

    expect(response.status).toBe(200);
    expect(String(response.body)).toContain("Created: Doc");
  });

  it("rejects non-wrapped requests with structured format guidance when enabled", async () => {
    const server = createMdanServer({
      actionProof: { secret: "proof-secret" }
    });
    server.post("/resources", async () => createEnvelope());

    const response = await handleJsonPost(server, "/resources", '{"title":"Doc"}');

    expect(response.status).toBe(400);
    expect(String(response.body)).toContain("Invalid Action Request Format");
    expect(String(response.body)).toContain('\\"expected_format\\": \\"mdan-action-input-v1\\"');
    expect(String(response.body)).toContain("action.proof");
  });

  it("accepts action requests with server-issued proof", async () => {
    const server = createMdanServer({
      actionProof: { secret: "proof-secret" }
    });
    server.page("/entry", async () => createEnvelope());
    server.post("/resources", async ({ inputs }) => ({
      ...createEnvelope(),
      view: {
        ...createEnvelope().view,
        regions: { editor: `Created: ${inputs.title}` }
      }
    }));

    const operation = await readEntryOperation(server);
    expect(operation?.submitFormat).toBe("mdan-action-input-v1");
    expect(operation?.submitExample).toBeTruthy();
    expect(operation?.inputSchema).toBeTruthy();

    const proofBody = JSON.stringify({
      action: {
        proof: String(operation?.actionProof)
      },
      input: {
        title: "Doc"
      }
    });

    const response = await handleJsonPost(server, "/resources", proofBody);

    expect(response.status).toBe(200);
    expect(String(response.body)).toContain("Created: Doc");
  });

  it("emits action proof metadata in json page responses and accepts json-issued proof", async () => {
    const server = createMdanServer({
      actionProof: { secret: "proof-secret" }
    });
    server.page("/entry", async () => createEnvelope());
    server.post("/resources", async ({ inputs }) => ({
      ...createEnvelope(),
      view: {
        ...createEnvelope().view,
        regions: { editor: `Created: ${inputs.title}` }
      }
    }));

    const pageResponse = await handleJsonGet(server, "/entry");

    expect(pageResponse.status).toBe(200);
    expect(pageResponse.headers["content-type"]).toBe("application/json");
    const operation = readJsonOperation(String(pageResponse.body));
    expect(operation.action_proof).toBeTypeOf("string");
    expect(operation.submit_format).toBe("mdan-action-input-v1");
    expect(operation.submit_example).toBeTruthy();

    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot(JSON.parse(String(pageResponse.body)));
    const headlessOperation = snapshot.blocks[0]?.operations[0];
    expect(headlessOperation?.actionProof).toBeTypeOf("string");
    expect(headlessOperation?.submitFormat).toBe("mdan-action-input-v1");

    const proofBody = JSON.stringify({
      action: {
        proof: String(headlessOperation?.actionProof)
      },
      input: {
        title: "Doc"
      }
    });

    const response = await handleJsonPost(server, "/resources", proofBody);

    expect(response.status).toBe(200);
    expect(String(response.body)).toContain("Created: Doc");
  });

  it("rejects when request violates declared input schema constraints", async () => {
    const server = createMdanServer({
      actionProof: { secret: "proof-secret" }
    });
    server.page("/entry", async () => ({
      content: `# Demo

::: block{id="editor" actions="createResource"}
Create resource.
:::`,
      actions: {
        app_id: "runtime-action-proof",
        state_id: "runtime-action-proof:constraints",
        state_version: 1,
        blocks: ["editor"],
        actions: [
          {
            id: "createResource",
            label: "Create",
            verb: "write",
            transport: { method: "POST" },
            target: "/resources",
            input_schema: {
              type: "object",
              required: ["count", "enabled"],
              properties: {
                count: { type: "integer", minimum: 1 },
                enabled: { type: "boolean" }
              },
              additionalProperties: false
            }
          }
        ],
        allowed_next_actions: ["createResource"]
      },
      view: {
        route_path: "/demo",
        regions: {
          editor: "Create resource."
        }
      }
    }));
    server.post("/resources", async ({ inputs }) => ({
      ...createEnvelope(),
      view: {
        ...createEnvelope().view,
        regions: { editor: `Created: ${inputs.title}` }
      }
    }));

    const operation = await readEntryOperation(server);

    const response = await handleJsonPost(server, "/resources", {
      action: {
        proof: String(operation?.actionProof)
      },
      input: {
        count: "0",
        enabled: "maybe"
      }
    });

    expect(response.status).toBe(400);
    expect(String(response.body)).toContain("Invalid Action Input");
    expect(String(response.body)).toContain("count must be >= 1");
    expect(String(response.body)).toContain("enabled must be a boolean");
  });

  it("delivers typed schema-normalized inputs to handlers and keeps raw values available", async () => {
    const server = createMdanServer({
      actionProof: { secret: "proof-secret" }
    });
    let seenInputs: Record<string, unknown> | null = null;
    let seenRaw: Record<string, unknown> | null = null;
    server.page("/entry", async () => ({
      content: `# Demo

::: block{id="editor" actions="createResource"}
Create resource.
:::`,
      actions: {
        app_id: "runtime-action-proof",
        state_id: "runtime-action-proof:typed",
        state_version: 1,
        blocks: ["editor"],
        actions: [
          {
            id: "createResource",
            label: "Create",
            verb: "write",
            transport: { method: "POST" },
            target: "/resources",
            input_schema: {
              type: "object",
              required: ["score", "count", "enabled", "settings", "tags"],
              properties: {
                score: { type: "number" },
                count: { type: "integer" },
                enabled: { type: "boolean" },
                settings: { type: "object" },
                tags: { type: "array" },
                title: { type: "string" }
              },
              additionalProperties: false
            }
          }
        ],
        allowed_next_actions: ["createResource"]
      },
      view: {
        route_path: "/demo",
        regions: {
          editor: "Create resource."
        }
      }
    }));
    server.post("/resources", async ({ inputs, inputsRaw }) => {
      seenInputs = inputs;
      seenRaw = inputsRaw;
      return createEnvelope();
    });

    const operation = await readEntryOperation(server);

    const response = await handleJsonPost(server, "/resources", {
      action: {
        proof: String(operation?.actionProof)
      },
      input: {
        score: "4.2",
        count: "4",
        enabled: "true",
        settings: '{"mode":"fast"}',
        tags: '["a","b"]',
        title: "Doc"
      }
    });

    expect(response.status).toBe(200);
    expect(seenInputs).toEqual({
      score: 4.2,
      count: 4,
      enabled: true,
      settings: { mode: "fast" },
      tags: ["a", "b"],
      title: "Doc"
    });
    expect(seenRaw).toEqual({
      score: "4.2",
      count: "4",
      enabled: "true",
      settings: '{"mode":"fast"}',
      tags: '["a","b"]',
      title: "Doc"
    });
  });

  it("accepts form-style flat action metadata fields for compatibility", async () => {
    const server = createMdanServer({
      actionProof: { secret: "proof-secret" }
    });
    server.page("/entry", async () => createEnvelope());
    server.post("/resources", async ({ inputs }) => ({
      ...createEnvelope(),
      view: {
        ...createEnvelope().view,
        regions: { editor: `Created: ${inputs.title}` }
      }
    }));

    const operation = await readEntryOperation(server);

    const response = await handleJsonPost(server, "/resources", {
      "action.proof": String(operation?.actionProof),
      title: "Doc"
    });

    expect(response.status).toBe(200);
    expect(String(response.body)).toContain("Created: Doc");
  });

  it("rejects undeclared payload fields even when proof is valid", async () => {
    const server = createMdanServer({
      actionProof: { secret: "proof-secret" }
    });
    server.page("/entry", async () => createEnvelope());
    server.post("/resources", async ({ inputs }) => ({
      ...createEnvelope(),
      view: {
        ...createEnvelope().view,
        regions: { editor: `Created: ${inputs.title}` }
      }
    }));

    const operation = await readEntryOperation(server);

    const proofBody = JSON.stringify({
      action: {
        proof: String(operation?.actionProof)
      },
      input: {
        title: "Doc",
        admin: "1"
      }
    });

    const response = await handleJsonPost(server, "/resources", proofBody);

    expect(response.status).toBe(400);
    expect(String(response.body)).toContain("Invalid Action Payload");
  });

  it("rejects when confirmation is required but not provided", async () => {
    const server = createMdanServer({
      actionProof: { secret: "proof-secret" }
    });
    server.page("/entry", async () => createEnvelopeWithConfirmationPolicy("always"));
    server.post("/resources", async ({ inputs }) => ({
      ...createEnvelopeWithConfirmationPolicy("always"),
      view: {
        ...createEnvelopeWithConfirmationPolicy("always").view,
        regions: { editor: `Created: ${inputs.title}` }
      }
    }));

    const operation = await readEntryOperation(server);

    const proofBody = JSON.stringify({
      action: {
        proof: String(operation?.actionProof)
      },
      input: {
        title: "Doc"
      }
    });

    const response = await handleJsonPost(server, "/resources", proofBody);

    expect(response.status).toBe(400);
    expect(String(response.body)).toContain("Action Confirmation Required");
  });

  it("accepts when confirmation is required and explicitly provided", async () => {
    const server = createMdanServer({
      actionProof: { secret: "proof-secret" }
    });
    server.page("/entry", async () => createEnvelopeWithConfirmationPolicy("always"));
    server.post("/resources", async ({ inputs }) => ({
      ...createEnvelopeWithConfirmationPolicy("always"),
      view: {
        ...createEnvelopeWithConfirmationPolicy("always").view,
        regions: { editor: `Created: ${inputs.title}; confirmed=${String("actionConfirmed" in inputs)}` }
      }
    }));

    const operation = await readEntryOperation(server);

    const proofBody = JSON.stringify({
      action: {
        proof: String(operation?.actionProof),
        confirmed: true
      },
      input: {
        title: "Doc"
      }
    });

    const response = await handleJsonPost(server, "/resources", proofBody);

    expect(response.status).toBe(200);
    expect(String(response.body)).toContain("Created: Doc; confirmed=false");
  });

  it("does not require confirmation for high-and-above policy when risk is below high", async () => {
    const server = createMdanServer({
      actionProof: { secret: "proof-secret" }
    });
    server.page("/entry", async () =>
      createEnvelopeWithActionSemantics({ policy: "high-and-above", riskLevel: "medium" })
    );
    server.post("/resources", async ({ inputs }) => ({
      ...createEnvelopeWithActionSemantics({ policy: "high-and-above", riskLevel: "medium" }),
      view: {
        ...createEnvelope().view,
        regions: { editor: `Created: ${inputs.title}` }
      }
    }));

    const operation = await readEntryOperation(server);

    expect(operation?.requiresConfirmation).toBe(false);
    expect(operation?.submitExample).toEqual({
      action: {
        proof: "<operation.actionProof>"
      },
      input: {
        title: "<title>"
      }
    });

    const response = await handleJsonPost(server, "/resources", {
      action: {
        proof: String(operation?.actionProof)
      },
      input: {
        title: "Doc"
      }
    });

    expect(response.status).toBe(200);
    expect(String(response.body)).toContain("Created: Doc");
  });

  it("requires confirmation for high-and-above policy when risk is high", async () => {
    const server = createMdanServer({
      actionProof: { secret: "proof-secret" }
    });
    server.page("/entry", async () =>
      createEnvelopeWithActionSemantics({ policy: "high-and-above", riskLevel: "high" })
    );

    const operation = await readEntryOperation(server);

    expect(operation?.requiresConfirmation).toBe(true);
    expect(operation?.submitExample).toEqual({
      action: {
        proof: "<operation.actionProof>",
        confirmed: true
      },
      input: {
        title: "<title>"
      }
    });
  });

  it("keeps business fields untouched when action proof is disabled", async () => {
    const server = createMdanServer({
      actionProof: { disabled: true }
    });
    server.post("/resources", async ({ inputs }) => ({
      ...createEnvelope(),
      view: {
        ...createEnvelope().view,
        regions: {
          editor: `ProofField=${inputs.actionProof ?? "missing"}; ConfirmField=${inputs.actionConfirmed ?? "missing"}`
        }
      }
    }));

    const response = await handleJsonPost(server, "/resources", {
      actionProof: "business-proof",
      actionConfirmed: "business-flag"
    });

    expect(response.status).toBe(200);
    expect(String(response.body)).toContain("ProofField=business-proof; ConfirmField=business-flag");
  });
});
