import { describe, expect, it } from "vitest";

import { assertActionsContractEnvelope, validateActionsContractEnvelope } from "../../src/protocol/contracts.js";

describe("actions contract validation", () => {
  it("accepts a valid envelope", () => {
    const envelope = {
      content: `# Demo

Body

::: block{id="main" actions="open,submit"}`,
      actions: {
        app_id: "contracts-test",
        state_id: "contracts-test:valid",
        state_version: 1,
        security: {
          default_confirmation_policy: "never"
        },
        actions: [
          {
            id: "open",
            verb: "route",
            target: "/open",
            transport: { method: "GET" },
            input_schema: { type: "object", properties: {}, required: [] }
          },
          {
            id: "submit",
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
        ],
        allowed_next_actions: ["open", "submit"]
      }
    };

    expect(validateActionsContractEnvelope(envelope)).toEqual([]);
    expect(() => assertActionsContractEnvelope(envelope)).not.toThrow();
  });

  it("reports structural and consistency violations", () => {
    const envelope = {
      content: `# Demo

Body

::: block{id="main" actions="missingAction"}`,
      actions: {
        security: {
          default_confirmation_policy: "sometimes"
        },
        actions: [
          {
            id: "",
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
        ],
        allowed_next_actions: ["missingAction"]
      }
    };

    const violations = validateActionsContractEnvelope(envelope);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some((entry) => entry.path.includes("actions.actions[0].id"))).toBe(true);
    expect(
      violations.some((entry) =>
        entry.path.includes("actions.security.default_confirmation_policy")
      )
    ).toBe(true);
    expect(
      violations.some((entry) =>
        entry.path.includes("actions.actions[0].security.confirmation_policy")
      )
    ).toBe(true);
    expect(violations.some((entry) => entry.path.includes("actions.allowed_next_actions"))).toBe(true);
    expect(() => assertActionsContractEnvelope(envelope)).toThrow(/invalid actions contract/);
  });

  it("rejects duplicate action ids", () => {
    const envelope = {
      content: `# Demo

Body

::: block{id="main" actions="open"}`,
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
    expect(violations.some((entry) => entry.path.includes("actions.actions[1].id"))).toBe(true);
    expect(() => assertActionsContractEnvelope(envelope)).toThrow(/invalid actions contract/);
  });

  it("leaves duplicate block ids for higher-layer content validation", () => {
    const envelope = {
      content: `# Demo

First

::: block{id="main" actions="open"}

Second

::: block{id="main" actions="open"}`,
      actions: {
        app_id: "contracts-test",
        state_id: "contracts-test:duplicate-action-refs",
        state_version: 1,
        actions: [
          {
            id: "open",
            verb: "route",
            target: "/open"
          }
        ]
      }
    };

    const violations = validateActionsContractEnvelope(envelope);
    expect(violations.some((entry) => entry.path.includes("content.block[main].id"))).toBe(false);
    expect(() => assertActionsContractEnvelope(envelope)).not.toThrow();
  });

  it("leaves duplicate block action references for higher-layer content validation", () => {
    const envelope = {
      content: `# Demo

Body

::: block{id="main" actions="open,open"}`,
      actions: {
        app_id: "contracts-test",
        state_id: "contracts-test:duplicate-action-refs",
        state_version: 1,
        actions: [
          {
            id: "open",
            verb: "route",
            target: "/open"
          }
        ]
      }
    };

    const violations = validateActionsContractEnvelope(envelope);
    expect(violations.some((entry) => entry.path.includes("content.block[main].actions"))).toBe(false);
    expect(() => assertActionsContractEnvelope(envelope)).not.toThrow();
  });
});
