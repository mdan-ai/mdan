import { describe, expect, it } from "vitest";

import { adaptReadableSurfaceToHeadlessSnapshot } from "../../src/surface/adapter.js";
import type { ReadableSurface } from "../../src/content/readable-markdown.js";
import type { JsonAction, MdanActionManifest } from "../../src/protocol/surface.js";

type LegacyFixtureSurface = {
  content: string;
  actions: MdanActionManifest;
  view?: {
    route_path?: string;
    regions?: Record<string, string>;
  };
};

function adaptJsonEnvelopeToHeadlessSnapshot(input: LegacyFixtureSurface) {
  const surface: ReadableSurface = {
    markdown: input.content,
    actions: input.actions,
    ...(input.view?.route_path ? { route: input.view.route_path } : {}),
    ...(input.view?.regions ? { regions: input.view.regions } : {})
  };
  return adaptReadableSurfaceToHeadlessSnapshot(surface);
}

function manifest(
  blocks: Record<string, string[]>,
  actions: Array<JsonAction & { id: string }>,
  extra: Omit<MdanActionManifest, "blocks" | "actions"> = {}
): MdanActionManifest {
  return {
    ...extra,
    blocks: Object.fromEntries(
      Object.entries(blocks).map(([name, actionIds]) => [
        name,
        {
          actions: actionIds
        }
      ])
    ),
    actions: Object.fromEntries(
      actions.map((action) => {
        const { id, ...definition } = action;
        return [id, definition];
      })
    )
  };
}

describe("adaptJsonEnvelopeToHeadlessSnapshot", () => {
  it("maps a readable surface manifest into headless route, blocks, inputs, and operations", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot({
      content: `---
app_id: "auth-guestbook"
state_id: "auth-guestbook:login:1"
state_version: 1
---

# Sign In

## Login

Sign in with your username and password.

<!-- mdan:block id="login" -->
`,
      actions: manifest(
        { login: ["login", "open_register"] },
        [
          {
            id: "open_register",
            label: "Create Account",
            verb: "route",
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
              required: ["username", "password", "note"],
              properties: {
                username: { type: "string" },
                password: { type: "string", format: "password" },
                note: { type: "string", maxLength: 200 }
              },
              additionalProperties: false
            }
          }
        ],
        {
          app_id: "auth-guestbook",
          state_id: "auth-guestbook:login:1",
          state_version: 1
        }
      ),
      view: {
        route_path: "/auth/login",
        regions: {
          login: "Sign in with your username and password."
        }
      }
    });

    expect(snapshot.route).toBe("/auth/login");
    expect(snapshot.markdown).toContain("# Sign In");
    expect(snapshot.markdown).not.toContain("state_id:");

    expect(snapshot.blocks).toHaveLength(1);
    expect(snapshot.blocks[0]?.name).toBe("login");
    expect(snapshot.blocks[0]?.markdown).toContain("username and password");
    expect(snapshot.blocks[0]?.inputs).toHaveLength(3);
    expect(snapshot.blocks[0]?.inputs[0]).toMatchObject({
      name: "username",
      kind: "string",
      required: true,
      secret: false
    });
    expect(snapshot.blocks[0]?.inputs[1]).toMatchObject({
      name: "password",
      kind: "string",
      required: true,
      secret: true,
      format: "password"
    });
    expect(snapshot.blocks[0]?.inputs[2]).toMatchObject({
      name: "note",
      kind: "string",
      format: "textarea",
      required: true,
      secret: false,
      constraints: { maxLength: 200 }
    });
    expect(snapshot.blocks[0]?.operations).toEqual([
      {
        method: "POST",
        target: "/auth/login",
        name: "login",
        inputs: ["username", "password", "note"],
        label: "Sign In",
        verb: "write",
        security: { confirmationPolicy: "never" },
        inputSchema: {
          type: "object",
          required: ["username", "password", "note"],
          properties: {
            username: { type: "string" },
            password: { type: "string", format: "password" },
            note: { type: "string", maxLength: 200 }
          },
          additionalProperties: false
        }
      },
      {
        method: "GET",
        target: "/auth/register",
        name: "open_register",
        inputs: [],
        label: "Create Account",
        verb: "route",
        security: { confirmationPolicy: "never" },
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      }
    ]);
  });

  it("maps html comment block anchors and object action manifests into operations", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot({
      content: `# Demo

Visible page copy.

<!-- mdan:block id="main" -->
`,
      actions: {
        version: "mdan.page.v1",
        app_id: "starter",
        state_id: "starter:index",
        state_version: 1,
        blocks: {
          main: {
            trust: "untrusted",
            actions: ["submit_message"]
          }
        },
        actions: {
          submit_message: {
            label: "Submit",
            verb: "write",
            target: "/post",
            transport: {
              method: "POST"
            },
            input_schema: {
              type: "object",
              required: ["message"],
              properties: {
                message: { type: "string" }
              },
              additionalProperties: false
            }
          }
        }
      },
      view: {
        route_path: "/",
        regions: {
          main: "- Booted"
        }
      }
    });

    expect(snapshot.markdown).toContain("Visible page copy.");
    expect(snapshot.blocks).toHaveLength(1);
    expect(snapshot.blocks[0]?.name).toBe("main");
    expect(snapshot.blocks[0]?.markdown).toBe("- Booted");
    expect(snapshot.blocks[0]?.operations).toEqual([
      {
        method: "POST",
        target: "/post",
        name: "submit_message",
        inputs: ["message"],
        label: "Submit",
        verb: "write",
        security: { confirmationPolicy: "never" },
        inputSchema: {
          type: "object",
          required: ["message"],
          properties: {
            message: { type: "string" }
          },
          additionalProperties: false
        }
      }
    ]);
  });

  it("falls back to POST when action verb is write and transport is missing", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot({
      content: `# Demo

Body

<!-- mdan:block id="main" -->`,
      actions: manifest(
        { main: ["submit"] },
        [
          {
            id: "submit",
            verb: "write",
            target: "/submit"
          }
        ]
      ),
      view: {
        route_path: "/demo",
        regions: {
          main: "Body"
        }
      }
    });

    expect(snapshot.blocks[0]?.operations).toEqual([
      {
        method: "POST",
        target: "/submit",
        name: "submit",
        inputs: [],
        verb: "write",
        security: { confirmationPolicy: "never" }
      }
    ]);
  });

  it("ignores unsupported response modes during semantic projection", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot({
      content: `# Demo

Body

<!-- mdan:block id="main" -->`,
      actions: manifest(
        { main: ["submit"] },
        [
          {
            id: "submit",
            verb: "write",
            target: "/submit",
            state_effect: {
              response_mode: "full"
            }
          }
        ]
      ),
      view: {
        route_path: "/demo",
        regions: {
          main: "Body"
        }
      }
    });

    expect(snapshot.blocks[0]?.operations[0]).toMatchObject({
      method: "POST",
      target: "/submit",
      name: "submit"
    });
    expect(snapshot.blocks[0]?.operations[0]?.stateEffect).toBeUndefined();
  });

  it("derives GET from route verb and preserves route path", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot({
      content: `# Demo

Body

<!-- mdan:block id="main" -->`,
      actions: manifest(
        { main: ["go"] },
        [
          {
            id: "go",
            verb: "route",
            target: "/next"
          }
        ]
      ),
      view: {
        route_path: "/demo",
        regions: {
          main: "Body"
        }
      }
    });

    expect(snapshot.route).toBe("/demo");
    expect(snapshot.blocks[0]?.operations[0]?.method).toBe("GET");
  });

  it("only projects auto dependencies onto GET operations", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot({
      content: `# Demo

Body

<!-- mdan:block id="main" -->`,
      actions: manifest(
        { main: ["refresh", "submit"] },
        [
          {
            id: "refresh",
            verb: "read",
            target: "/refresh",
            transport: {
              method: "GET"
            },
            auto: true
          },
          {
            id: "submit",
            verb: "write",
            target: "/submit",
            transport: {
              method: "POST"
            },
            auto: true
          }
        ]
      ),
      view: {
        route_path: "/demo",
        regions: {
          main: "Body"
        }
      }
    });

    expect(snapshot.blocks[0]?.operations).toEqual([
      {
        method: "GET",
        target: "/refresh",
        name: "refresh",
        inputs: [],
        auto: true,
        verb: "read",
        security: { confirmationPolicy: "never" }
      },
      {
        method: "POST",
        target: "/submit",
        name: "submit",
        inputs: [],
        verb: "write",
        security: { confirmationPolicy: "never" }
      }
    ]);
  });

  it("keeps agent-only blocks out of human-visible page and region markdown", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot({
      content: `# Demo

Visible page copy.

<!-- agent:begin id="page-prompt" -->
## Rules
Agent-only page rule.
<!-- agent:end -->

Body

<!-- mdan:block id="main" -->`,
      actions: manifest({ main: ["submit"] }, [{ id: "submit", verb: "write", target: "/submit" }]),
      view: {
        route_path: "/demo",
        regions: {
          main: `Visible region copy.

<!-- agent:begin id="region-prompt" -->
## Result
Agent-only region result.
<!-- agent:end -->`
        }
      }
    });

    expect(snapshot.markdown).toContain("Visible page copy.");
    expect(snapshot.markdown).not.toContain("Agent-only page rule.");
    expect(snapshot.blocks[0]?.markdown).toContain("Visible region copy.");
    expect(snapshot.blocks[0]?.markdown).not.toContain("Agent-only region result.");
  });

  it("projects non-default confirmation policy onto operations", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot({
      content: `# Demo

Body

<!-- mdan:block id="main" -->`,
      actions: manifest(
        { main: ["danger"] },
        [
          {
            id: "danger",
            verb: "write",
            target: "/danger",
            guard: { risk_level: "high" }
          }
        ],
        {
          security: {
            default_confirmation_policy: "high-and-above"
          }
        }
      ),
      view: {
        route_path: "/demo",
        regions: {
          main: "Body"
        }
      }
    });

    expect(snapshot.blocks[0]?.operations).toEqual([
      {
        method: "POST",
        target: "/danger",
        name: "danger",
        inputs: [],
        verb: "write",
        stateEffect: undefined,
        guard: { riskLevel: "high" },
        security: { confirmationPolicy: "high-and-above" }
      }
    ]);
  });

  it("lets action-level confirmation policy override the default policy", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot({
      content: `# Demo

Body

<!-- mdan:block id="main" -->`,
      actions: manifest(
        { main: ["danger", "quiet"] },
        [
          {
            id: "danger",
            verb: "write",
            target: "/danger",
            security: {
              confirmation_policy: "high-and-above"
            }
          },
          {
            id: "quiet",
            verb: "write",
            target: "/quiet",
            security: {
              confirmation_policy: "never"
            }
          }
        ],
        {
          security: {
            default_confirmation_policy: "always"
          }
        }
      ),
      view: {
        route_path: "/demo",
        regions: {
          main: "Body"
        }
      }
    });

    expect(snapshot.blocks[0]?.operations).toEqual([
      {
        method: "POST",
        target: "/danger",
        name: "danger",
        inputs: [],
        verb: "write",
        security: { confirmationPolicy: "high-and-above" }
      },
      {
        method: "POST",
        target: "/quiet",
        name: "quiet",
        inputs: [],
        verb: "write",
        security: { confirmationPolicy: "never" }
      }
    ]);
  });

  it("maps protocol state_effect metadata into internal camelCase metadata", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot({
      content: `# Demo

Body

<!-- mdan:block id="main" -->`,
      actions: manifest(
        { main: ["refresh"] },
        [
          {
            id: "refresh",
            verb: "write",
            target: "/refresh",
            state_effect: {
              response_mode: "region",
              updated_regions: ["summary", "status"]
            }
          }
        ]
      ),
      view: {
        route_path: "/demo",
        regions: {
          main: "Body"
        }
      }
    });

    expect(snapshot.blocks[0]?.operations[0]).toMatchObject({
      stateEffect: {
        responseMode: "region",
        updatedRegions: ["summary", "status"]
      }
    });
  });

  it("maps schema metadata to input description/default/options/constraints", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot({
      content: `# Demo

Body

<!-- mdan:block id="main" -->`,
      actions: manifest(
        { main: ["submit"] },
        [
          {
            id: "submit",
            verb: "write",
            target: "/submit",
            input_schema: {
              type: "object",
              required: ["title", "status"],
              properties: {
                title: {
                  type: "string",
                  description: "Document title",
                  default: "draft",
                  minLength: 3,
                  maxLength: 10
                },
                status: {
                  type: "string",
                  enum: ["draft", "published"]
                }
              }
            }
          }
        ]
      ),
      view: {
        route_path: "/demo",
        regions: {
          main: "Body"
        }
      }
    });

    expect(snapshot.blocks[0]?.inputs).toHaveLength(2);
    expect(snapshot.blocks[0]?.inputs[0]).toMatchObject({
      kind: "string",
      name: "title",
      required: true,
      secret: false,
      description: "Document title",
      defaultValue: "draft",
      constraints: { minLength: 3, maxLength: 10 }
    });
    expect(snapshot.blocks[0]?.inputs[1]).toMatchObject({
      kind: "enum",
      name: "status",
      required: true,
      secret: false,
      options: ["draft", "published"]
    });
  });

  it("projects canonical field kind and format metadata", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot({
      content: `# Demo

Body

<!-- mdan:block id="main" -->`,
      actions: manifest(
        { main: ["submit"] },
        [
          {
            id: "submit",
            verb: "write",
            target: "/submit",
            input_schema: {
              type: "object",
              required: ["count", "password"],
              properties: {
                count: { type: "integer", minimum: 1 },
                password: { type: "string", format: "password" }
              }
            }
          }
        ]
      ),
      view: {
        route_path: "/demo",
        regions: {
          main: "Body"
        }
      }
    });

    expect(snapshot.blocks[0]?.inputs).toContainEqual(
      expect.objectContaining({
        name: "count",
        kind: "integer"
      })
    );
    expect(snapshot.blocks[0]?.inputs).toContainEqual(
      expect.objectContaining({
        name: "password",
        kind: "string",
        secret: true,
        format: "password"
      })
    );
  });

  it("keeps the first same-name field schema when block actions disagree", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot({
      content: `# Demo

Body

<!-- mdan:block id="main" -->`,
      actions: manifest(
        { main: ["save", "search"] },
        [
          {
            id: "save",
            verb: "write",
            target: "/save",
            input_schema: {
              type: "object",
              properties: {
                value: { type: "string" }
              }
            }
          },
          {
            id: "search",
            verb: "read",
            target: "/search",
            input_schema: {
              type: "object",
              properties: {
                value: { type: "integer" }
              }
            }
          }
        ]
      ),
      view: {
        route_path: "/demo",
        regions: {
          main: "Body"
        }
      }
    });

    expect(snapshot.blocks[0]?.inputs).toEqual([
      expect.objectContaining({
        name: "value",
        kind: "string"
      })
    ]);
  });
});
