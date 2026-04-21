import { describe, expect, it } from "vitest";

import { normalizeActionDefinition } from "../../src/app-internal/normalize-action.js";
import { projectBlockOperations } from "../../src/app-internal/project-block-operations.js";

describe("projectBlockOperations", () => {
  it("projects normalized actions into block operations", () => {
    const refresh = normalizeActionDefinition({
      pageId: "root",
      pagePath: "/",
      actionId: "refresh_main",
      definition: {
        method: "GET"
      }
    });
    const submit = normalizeActionDefinition({
      pageId: "root",
      pagePath: "/",
      actionId: "submit_message",
      definition: {
        method: "POST",
        path: "/post",
        label: "Submit",
        input: {
          message: {
            kind: "text",
            required: true
          }
        },
        run() {
          return { pagePath: "/" };
        }
      }
    });

    const operations = projectBlockOperations([refresh, submit]);

    expect(operations).toEqual([
      {
        method: "GET",
        name: "refresh_main",
        target: "/__actions/refresh_main",
        inputs: [],
        label: "Refresh Main",
        verb: "read",
        stateEffect: {
          responseMode: "page"
        },
        security: {
          confirmationPolicy: "never"
        },
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        method: "POST",
        name: "submit_message",
        target: "/post",
        inputs: ["message"],
        label: "Submit",
        verb: "write",
        stateEffect: {
          responseMode: "page"
        },
        security: {
          confirmationPolicy: "never"
        },
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
});
