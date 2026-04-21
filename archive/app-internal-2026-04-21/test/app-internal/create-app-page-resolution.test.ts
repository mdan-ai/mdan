import { describe, expect, it } from "vitest";

import { createApp } from "../../src/app-internal/create-app.js";

describe("internal createApp page resolution", () => {
  it("can resolve one page request into another page before render", async () => {
    const app = createApp({
      id: "auth-guestbook",
      state: {
        authenticated: false
      }
    });

    app.page("/login", {
      markdownPath: "./app/login.md",
      markdownSource: `# Sign In

::: block{id="auth_status" trust="untrusted"}
:::`,
      blocks: {
        auth_status({ data }) {
          const message = typeof data?.message === "string" ? data.message : "Not signed in.";
          return `## Context
Current auth status.

## Result
${message}`;
        }
      }
    });

    app.page("/guestbook", {
      markdownPath: "./app/guestbook.md",
      markdownSource: `# Guestbook

::: block{id="messages" trust="untrusted"}
:::`,
      resolve({ state }) {
        if (!state.authenticated) {
          return {
            pagePath: "/login",
            data: {
              message: "Please sign in first."
            }
          };
        }

        return null;
      },
      blocks: {
        messages() {
          return `## Context
Guestbook messages.

## Result
- No messages yet`;
        }
      }
    });

    const server = app.createServer();

    const guestbook = await server.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(guestbook.status).toBe(200);
    expect(String(guestbook.body)).toContain("# Sign In");
    expect(String(guestbook.body)).toContain("Please sign in first.");
  });
});
