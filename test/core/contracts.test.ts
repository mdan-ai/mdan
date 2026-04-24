import { describe, expect, it } from "vitest";

import { assertActionsContractEnvelope, validateActionsContractEnvelope } from "../../src/protocol/contracts.js";

describe("actions contract validation", () => {
  it("accepts a valid envelope", () => {
    const envelope = {
      content: `# Demo

Body

<!-- mdan:block id="main" -->`,
      actions: {
        app_id: "contracts-test",
        state_id: "contracts-test:valid",
        state_version: 1,
        security: {
          default_confirmation_policy: "never"
        },
        blocks: {
          main: {
            actions: ["open", "submit"]
          }
        },
        actions: {
          open: {
            verb: "route",
            target: "/open",
            transport: { method: "GET" },
            input_schema: { type: "object", properties: {}, required: [] }
          },
          submit: {
            verb: "write",
            target: "/submit",
            transport: { method: "POST" },
            state_effect: { response_mode: "region" },
            input_schema: {
              type: "object",
              required: ["title"],
              properties: { title: { type: "string" } }
            }
          }
        }
      }
    };

    expect(validateActionsContractEnvelope(envelope)).toEqual([]);
    expect(() => assertActionsContractEnvelope(envelope)).not.toThrow();
  });

  it("accepts object keyed blocks and actions without allowed_next_actions", () => {
    const envelope = {
      content: `# Demo

Body

<!-- mdan:block id="main" -->`,
      actions: {
        version: "mdan.page.v1",
        app_id: "contracts-test",
        state_id: "contracts-test:object-actions",
        state_version: 1,
        blocks: {
          main: {
            trust: "untrusted",
            actions: ["submit"]
          }
        },
        actions: {
          submit: {
            verb: "write",
            target: "/submit",
            transport: { method: "POST" },
            input_schema: {
              type: "object",
              required: ["title"],
              properties: { title: { type: "string" } },
              additionalProperties: false
            }
          }
        }
      }
    };

    expect(validateActionsContractEnvelope(envelope)).toEqual([]);
    expect(() => assertActionsContractEnvelope(envelope)).not.toThrow();
  });

  it("reports structural and consistency violations", () => {
    const envelope = {
      content: `# Demo

Body

<!-- mdan:block id="main" -->`,
      actions: {
        security: {
          default_confirmation_policy: "sometimes"
        },
        blocks: [],
        actions: {
          bad: {
            verb: "invalidVerb",
            target: "",
            transport: { method: "PUT" },
            state_effect: { response_mode: "full" },
            security: { confirmation_policy: "urgent-only" },
            input_schema: {
              required: [1],
              properties: []
            }
          }
        },
        allowed_next_actions: ["missingAction"]
      }
    };

    const violations = validateActionsContractEnvelope(envelope);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations).toContainEqual({
      path: "actions.blocks",
      message: "actions.blocks must be an object keyed by block id"
    });
    expect(
      violations.some((entry) =>
        entry.path.includes("actions.security.default_confirmation_policy")
      )
    ).toBe(true);
    expect(
      violations.some((entry) =>
        entry.path.includes("actions.actions.bad.security.confirmation_policy")
      )
    ).toBe(true);
    expect(violations).toContainEqual({
      path: "actions.allowed_next_actions",
      message: "allowed_next_actions is not supported; use blocks.<id>.actions"
    });
    expect(() => assertActionsContractEnvelope(envelope)).toThrow(/invalid actions contract/);
  });

  it("rejects array action manifests", () => {
    const envelope = {
      content: `# Demo

Body

<!-- mdan:block id="main" -->`,
      actions: {
        app_id: "contracts-test",
        state_id: "contracts-test:duplicate-blocks",
        state_version: 1,
        actions: [
          {
            id: "open",
            verb: "route",
            target: "/first"
          },
          {
            id: "open",
            verb: "write",
            target: "/second"
          }
        ]
      }
    };

    const violations = validateActionsContractEnvelope(envelope);
    expect(violations).toContainEqual({
      path: "actions.actions",
      message: "actions.actions must be an object keyed by action id"
    });
    expect(() => assertActionsContractEnvelope(envelope)).toThrow(/invalid actions contract/);
  });

  it("rejects array block manifests", () => {
    const envelope = {
      content: `# Demo

<!-- mdan:block id="main" -->`,
      actions: {
        app_id: "contracts-test",
        state_id: "contracts-test:duplicate-action-refs",
        state_version: 1,
        blocks: ["main"],
        actions: {
          open: {
            verb: "route",
            target: "/open"
          }
        }
      }
    };

    const violations = validateActionsContractEnvelope(envelope);
    expect(violations).toContainEqual({
      path: "actions.blocks",
      message: "actions.blocks must be an object keyed by block id"
    });
    expect(() => assertActionsContractEnvelope(envelope)).toThrow(/invalid actions contract/);
  });

  it("validates block action references from the manifest", () => {
    const envelope = {
      content: `# Demo

Body

<!-- mdan:block id="main" -->`,
      actions: {
        app_id: "contracts-test",
        state_id: "contracts-test:duplicate-action-refs",
        state_version: 1,
        blocks: {
          main: {
            actions: ["missing"]
          }
        },
        actions: {
          open: {
            verb: "route",
            target: "/open"
          }
        }
      }
    };

    const violations = validateActionsContractEnvelope(envelope);
    expect(violations).toContainEqual({
      path: "actions.blocks.main.actions",
      message: 'unknown action id reference: "missing"'
    });
    expect(() => assertActionsContractEnvelope(envelope)).toThrow(/invalid actions contract/);
  });
});
