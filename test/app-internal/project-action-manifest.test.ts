import { describe, expect, it } from "vitest";

import { normalizeActionDefinition } from "../../src/app-internal/normalize-action.js";
import { projectActionManifest } from "../../src/app-internal/project-action-manifest.js";

describe("projectActionManifest", () => {
  it("projects normalized actions into executable manifest content", () => {
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

    const manifest = projectActionManifest({
      appId: "starter",
      stateId: "starter:home:1",
      stateVersion: 1,
      blockNames: ["main"],
      actions: [refresh, submit]
    });

    expect(manifest).toEqual({
      app_id: "starter",
      state_id: "starter:home:1",
      state_version: 1,
      response_mode: "page",
      blocks: ["main"],
      actions: [
        {
          id: "refresh_main",
          label: "Refresh Main",
          verb: "read",
          transport: { method: "GET" },
          target: "/__actions/refresh_main",
          input_schema: {
            type: "object",
            properties: {},
            additionalProperties: false
          }
        },
        {
          id: "submit_message",
          label: "Submit",
          verb: "write",
          transport: { method: "POST" },
          target: "/post",
          input_schema: {
            type: "object",
            required: ["message"],
            properties: {
              message: { type: "string" }
            },
            additionalProperties: false
          }
        }
      ],
      allowed_next_actions: ["refresh_main", "submit_message"]
    });
  });
});
