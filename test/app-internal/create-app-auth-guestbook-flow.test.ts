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

describe("internal createApp auth guestbook flow", () => {
  it("supports login, navigation, posting, and logout across multiple pages", async () => {
    const app = createApp({
      id: "auth-guestbook",
      state: {
        users: {
          ada: "lovelace"
        },
        currentUser: "",
        messages: [] as string[]
      }
    });

    app.page("/login", {
      markdownPath: "./app/login.md",
      markdownSource: `# Sign In

::: block{id="auth_status" trust="untrusted"}
:::

::: block{id="login" actions="login,open_register" trust="trusted"}
:::`,
      blocks: {
        auth_status({ data, state }) {
          const currentUser = typeof state.currentUser === "string" ? state.currentUser : "";
          const defaultMessage = currentUser ? `Signed in as ${currentUser}` : "Not signed in.";
          const message = typeof data?.message === "string" ? data.message : defaultMessage;
          return `## Context
Current auth status.

## Result
${message}`;
        },
        login() {
          return `## Context
Sign in or navigate to registration.

## Result
Submit valid credentials or open the register page.`;
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
            const expected = state.users[username];

            if (!username || !password || expected !== password) {
              return {
                pagePath: "/login",
                data: {
                  message: "Login rejected. Check username and password."
                }
              };
            }

            state.currentUser = username;
            return {
              pagePath: "/guestbook",
              data: {
                message: `Signed in as ${username}`
              }
            };
          }
        },
        open_register: {
          method: "GET",
          path: "/register",
          run() {
            return { pagePath: "/register" };
          }
        }
      }
    });

    app.page("/register", {
      markdownPath: "./app/register.md",
      markdownSource: `# Register

::: block{id="register_status" trust="untrusted"}
:::

::: block{id="register" actions="register,open_login" trust="trusted"}
:::`,
      blocks: {
        register_status({ data }) {
          const message = typeof data?.message === "string" ? data.message : "Create a new account.";
          return `## Context
Current registration status.

## Result
${message}`;
        },
        register() {
          return `## Context
Register or return to sign in.

## Result
Submit valid registration data or open the login page.`;
        }
      },
      actions: {
        register: {
          method: "POST",
          path: "/auth/register",
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

            if (!username || !password) {
              return {
                pagePath: "/register",
                data: {
                  message: "Invalid input. Username and password are required."
                }
              };
            }
            if (state.users[username]) {
              return {
                pagePath: "/register",
                data: {
                  message: "Username already exists. Try another username or sign in."
                }
              };
            }

            state.users[username] = password;
            state.currentUser = username;
            return {
              pagePath: "/guestbook",
              data: {
                message: `Signed in as ${username}`
              }
            };
          }
        },
        open_login: {
          method: "GET",
          path: "/login",
          run() {
            return { pagePath: "/login" };
          }
        }
      }
    });

    app.page("/guestbook", {
      markdownPath: "./app/guestbook.md",
      markdownSource: `# Guestbook

::: block{id="session_status" trust="untrusted"}
:::

::: block{id="messages" actions="refresh_messages" trust="untrusted"}
:::

::: block{id="composer" actions="submit_message" trust="trusted"}
:::

::: block{id="session_actions" actions="logout" trust="trusted"}
:::`,
      resolve({ state }) {
        if (!state.currentUser) {
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
        session_status({ state, data }) {
          const currentUser = typeof state.currentUser === "string" ? state.currentUser : "";
          const message = typeof data?.message === "string" ? data.message : `Signed in as ${currentUser}`;
          return `## Context
Current session state.

## Result
${message}`;
        },
        messages({ state }) {
          const lines = state.messages.length > 0 ? state.messages.map((entry) => `- ${entry}`).join("\n") : "- No messages yet";
          return `## Context
Current guestbook feed.

## Result
${lines}`;
        },
        composer() {
          return `## Context
Add a message.

## Result
Submit a new guestbook entry.`;
        },
        session_actions() {
          return `## Context
End the current session.

## Result
Sign out when you are done.`;
        }
      },
      actions: {
        refresh_messages: {
          method: "GET",
          path: "/guestbook"
        },
        submit_message: {
          method: "POST",
          path: "/guestbook/post",
          input: {
            message: {
              kind: "text",
              required: true
            }
          },
          run({ input, state }) {
            const currentUser = String(state.currentUser ?? "");
            const message = String(input.message ?? "").trim();
            if (!currentUser) {
              return {
                pagePath: "/login",
                data: {
                  message: "Sign in required. Open /login and sign in."
                }
              };
            }
            if (!message) {
              return {
                pagePath: "/guestbook",
                data: {
                  message: `Signed in as ${currentUser}`
                }
              };
            }

            state.messages.unshift(`${currentUser}: ${message}`);
            return {
              pagePath: "/guestbook",
              data: {
                message: `Signed in as ${currentUser}`
              }
            };
          }
        },
        logout: {
          method: "POST",
          path: "/guestbook/logout",
          run({ state }) {
            state.currentUser = "";
            return {
              pagePath: "/login",
              data: {
                message: "Signed out."
              }
            };
          }
        }
      }
    });

    const server = app.createServer();

    const guestbookBeforeLogin = await server.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(guestbookBeforeLogin.status).toBe(200);
    expect(String(guestbookBeforeLogin.body)).toContain("# Sign In");
    expect(String(guestbookBeforeLogin.body)).toContain("Please sign in first.");

    const loginPage = await server.handle({
      method: "GET",
      url: "https://example.test/login",
      headers: { accept: "text/markdown" },
      cookies: {}
    });
    const loginProof = extractActionProof(String(loginPage.body), "login");

    const loggedIn = await server.handle({
      method: "POST",
      url: "https://example.test/auth/login",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        action: {
          proof: loginProof
        },
        input: {
          username: "ada",
          password: "lovelace"
        }
      }),
      cookies: {}
    });

    expect(loggedIn.status).toBe(200);
    expect(String(loggedIn.body)).toContain("# Guestbook");
    expect(String(loggedIn.body)).toContain("Signed in as ada");

    const postProof = extractActionProof(String(loggedIn.body), "submit_message");
    const posted = await server.handle({
      method: "POST",
      url: "https://example.test/guestbook/post",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        action: {
          proof: postProof
        },
        input: {
          message: "Hello guestbook"
        }
      }),
      cookies: {}
    });

    expect(posted.status).toBe(200);
    expect(String(posted.body)).toContain("ada: Hello guestbook");

    const logoutProof = extractActionProof(String(posted.body), "logout");
    const loggedOut = await server.handle({
      method: "POST",
      url: "https://example.test/guestbook/logout",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        action: {
          proof: logoutProof
        },
        input: {}
      }),
      cookies: {}
    });

    expect(loggedOut.status).toBe(200);
    expect(String(loggedOut.body)).toContain("# Sign In");
    expect(String(loggedOut.body)).toContain("Signed out.");
  });
});
