import { describe, expect, it } from "vitest";

import { normalizeActionDefinition } from "../../src/app-internal/normalize-action.js";

describe("normalizeActionDefinition", () => {
  it("fills in default label, path, and verb for a page action", () => {
    const action = normalizeActionDefinition({
      pageId: "home",
      pagePath: "/",
      actionId: "submit_message",
      definition: {
        method: "POST",
        input: {
          message: {
            kind: "text",
            required: true
          }
        },
        run({ input, state }) {
          return {
            pagePath: "/",
            patchState: {
              messages: [input.message, ...(Array.isArray((state as { messages?: unknown[] }).messages) ? (state as { messages?: unknown[] }).messages ?? [] : [])]
            }
          };
        }
      }
    });

    expect(action).toMatchObject({
      id: "submit_message",
      pageId: "home",
      pagePath: "/",
      method: "POST",
      path: "/__actions/submit_message",
      label: "Submit Message",
      verb: "write",
      input: {
        message: {
          kind: "text",
          required: true
        }
      }
    });
    expect(action.run).toBeTypeOf("function");
  });

  it("preserves explicit path and label while mapping GET to read", () => {
    const action = normalizeActionDefinition({
      pageId: "guestbook",
      pagePath: "/guestbook",
      actionId: "refresh_messages",
      definition: {
        method: "GET",
        path: "/guestbook/refresh",
        label: "Refresh",
        run() {
          return { pagePath: "/guestbook" };
        }
      }
    });

    expect(action).toMatchObject({
      id: "refresh_messages",
      pageId: "guestbook",
      pagePath: "/guestbook",
      method: "GET",
      path: "/guestbook/refresh",
      label: "Refresh",
      verb: "read",
      input: {}
    });
  });
});
