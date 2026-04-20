import { describe, expect, it } from "vitest";

import { adaptReadableSurfaceToHeadlessSnapshot } from "../../src/surface/adapter.js";
import type { ReadableSurface } from "../../src/content/artifact-surface.js";
import type { MdanActionManifest } from "../../src/protocol/surface.js";

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

describe("adaptJsonEnvelopeToHeadlessSnapshot", () => {
  it("maps JSON surface envelope into headless route, blocks, inputs, and operations", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot({
      content: `---
app_id: "auth-guestbook"
state_id: "auth-guestbook:login:1"
state_version: 1
---

# Sign In

## Login

::: block{id="login" actions="login,open_register" trust="trusted"}
Sign in with your username and password.
:::
`,
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
        allowed_next_actions: ["login", "open_register"]
      },
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

  it("falls back to POST when action verb is write and transport is missing", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot({
      content: `# Demo

::: block{id="main" actions="submit"}
Body
:::`,
      actions: {
        blocks: ["main"],
        actions: [
          {
            id: "submit",
            verb: "write",
            target: "/submit"
          }
        ]
      },
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

::: block{id="main" actions="submit"}
Body
:::`,
      actions: {
        actions: [
          {
            id: "submit",
            verb: "write",
            target: "/submit",
            state_effect: {
              response_mode: "full"
            }
          }
        ]
      },
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

  it("derives GET from navigate verb and preserves route path", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot({
      content: `# Demo

::: block{id="main" actions="go"}
Body
:::`,
      actions: {
        actions: [
          {
            id: "go",
            verb: "navigate",
            target: "/next"
          }
        ]
      },
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

::: block{id="main" actions="refresh,submit"}
Body
:::`,
      actions: {
        blocks: ["main"],
        actions: [
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
      },
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

  it("filters operations using allowed_next_actions", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot({
      content: `# Demo

::: block{id="main" actions="allowed,blocked"}
Body
:::`,
      actions: {
        actions: [
          { id: "allowed", verb: "write", target: "/ok" },
          { id: "blocked", verb: "write", target: "/nope" }
        ],
        allowed_next_actions: ["allowed"]
      },
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
        target: "/ok",
        name: "allowed",
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

::: block{id="main" actions="submit"}
Body
:::`,
      actions: {
        actions: [{ id: "submit", verb: "write", target: "/submit" }]
      },
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

  it("filters all operations when allowed_next_actions is explicitly empty", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot({
      content: `# Demo

::: block{id="main" actions="allowed,blocked"}
Body
:::`,
      actions: {
        actions: [
          { id: "allowed", verb: "write", target: "/ok" },
          { id: "blocked", verb: "write", target: "/nope" }
        ],
        allowed_next_actions: []
      },
      view: {
        route_path: "/demo",
        regions: {
          main: "Body"
        }
      }
    });

    expect(snapshot.blocks[0]?.operations).toEqual([]);
  });

  it("projects non-default confirmation policy onto operations", () => {
    const snapshot = adaptJsonEnvelopeToHeadlessSnapshot({
      content: `# Demo

::: block{id="main" actions="danger"}
Body
:::`,
      actions: {
        security: {
          default_confirmation_policy: "high-and-above"
        },
        actions: [
          {
            id: "danger",
            verb: "write",
            target: "/danger",
            guard: { risk_level: "high" }
          }
        ]
      },
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

::: block{id="main" actions="danger,quiet"}
Body
:::`,
      actions: {
        security: {
          default_confirmation_policy: "always"
        },
        actions: [
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
        ]
      },
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

::: block{id="main" actions="refresh"}
Body
:::`,
      actions: {
        actions: [
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
      },
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

::: block{id="main" actions="submit"}
Body
:::`,
      actions: {
        actions: [
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
      },
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

::: block{id="main" actions="submit"}
Body
:::`,
      actions: {
        actions: [
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
      },
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

::: block{id="main" actions="save,search"}
Body
:::`,
      actions: {
        actions: [
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
      },
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
