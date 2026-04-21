import { describe, expect, it } from "vitest";

import { createApp } from "../../src/app-internal/create-app.js";

function extractActionProof(markdown: string, actionId: string): string {
  const match = markdown.match(/```mdan\n([\s\S]*?)\n```/);
  expect(match?.[1]).toBeTruthy();
  const executable = JSON.parse(String(match?.[1])) as {
    actions?: Array<{ id?: string; action_proof?: string }>;
  };
  const action = executable.actions?.find((entry) => entry.id === actionId);
  expect(action?.action_proof).toBeTypeOf("string");
  return String(action?.action_proof);
}

describe("internal createApp page result data", () => {
  it("passes action result data into the next page render", async () => {
    const app = createApp({
      id: "auth-guestbook",
      state: {
        users: {
          ada: "lovelace"
        }
      }
    });

    app.page("/login", {
      markdownPath: "./app/login.md",
      markdownSource: `# Sign In

::: block{id="auth_status" trust="untrusted"}
:::

::: block{id="login" actions="login" trust="trusted"}
:::`,
      blocks: {
        auth_status({ data }) {
          const message = typeof data?.message === "string" ? data.message : "Not signed in.";
          return `## Context
Current auth status.

## Result
${message}`;
        },
        login() {
          return `## Context
Login form.

## Result
Submit your username and password.`;
        }
      },
      actions: {
        login: {
          method: "POST",
          path: "/auth/login",
          input: {
            username: {
              kind: "text",
              required: true
            },
            password: {
              kind: "text",
              required: true
            }
          },
          run({ input, state }) {
            const username = String(input.username ?? "").trim();
            const password = String(input.password ?? "");
            const expected = (state as { users: Record<string, string> }).users[username];

            if (expected !== password) {
              return {
                pagePath: "/login",
                data: {
                  message: "Login rejected. Check username and password."
                }
              };
            }

            return {
              pagePath: "/login",
              data: {
                message: `Signed in as ${username}`
              }
            };
          }
        }
      }
    });

    const server = app.createServer();

    const home = await server.handle({
      method: "GET",
      url: "https://example.test/login",
      headers: { accept: "text/markdown" },
      cookies: {}
    });
    const proof = extractActionProof(String(home.body), "login");

    const failedLogin = await server.handle({
      method: "POST",
      url: "https://example.test/auth/login",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        action: {
          proof
        },
        input: {
          username: "ada",
          password: "wrong"
        }
      }),
      cookies: {}
    });

    expect(failedLogin.status).toBe(200);
    expect(String(failedLogin.body)).toContain("Login rejected. Check username and password.");
  });
});
