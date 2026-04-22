import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { actions, createApp, fields, signIn, signOut, type AppBrowserShellOptions } from "../../src/index.js";

type SessionState = {
  sid: string;
  username: string;
};

type MessageEntry = {
  username: string;
  text: string;
};

type ExampleAssets = {
  loginMarkdown: string;
  registerMarkdown: string;
  guestbookMarkdown: string;
};

function loadText(path: string): string {
  return readFileSync(path, "utf8");
}

function loadExampleAssets(): ExampleAssets {
  const exampleRoot = dirname(fileURLToPath(import.meta.url));
  const appDir = join(exampleRoot, "app");

  return {
    loginMarkdown: loadText(join(appDir, "login.md")),
    registerMarkdown: loadText(join(appDir, "register.md")),
    guestbookMarkdown: loadText(join(appDir, "guestbook.md"))
  };
}

const assets = loadExampleAssets();

export function createAuthGuestbookServer(browserShell: AppBrowserShellOptions = { moduleMode: "local-dist" }) {
  const users = new Map<string, string>();
  const sessions = new Map<string, SessionState>();
  const messages: MessageEntry[] = [];

  const app = createApp({
    appId: "auth-guestbook",
    browserShell,
    session: {
      async read(request) {
        const sid = request.cookies.mdan_session;
        return sid ? sessions.get(sid) ?? null : null;
      },
      async commit(mutation, response) {
        if (!mutation || mutation.type === "sign-out") {
          return;
        }
        const sid = typeof mutation.session.sid === "string" ? mutation.session.sid : "";
        const username = typeof mutation.session.username === "string" ? mutation.session.username : "";
        if (!sid || !username) {
          return;
        }
        sessions.set(sid, { sid, username });
        response.headers["set-cookie"] = `mdan_session=${encodeURIComponent(sid)}; Path=/; HttpOnly; SameSite=Lax`;
      },
      async clear(session, response, _request) {
        const sid = typeof session?.sid === "string" ? session.sid : "";
        if (sid) {
          sessions.delete(sid);
        }
        response.headers["set-cookie"] = "mdan_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
      }
    }
  });
  const loginPage = app.page("/login", {
    markdown: assets.loginMarkdown,
    actions: [
      actions.navigate("open_register", {
        label: "Create Account",
        target: "/register"
      }),
      actions.write("login", {
        label: "Sign In",
        target: "/auth/login",
        input: {
          username: fields.string({ required: true }),
          password: fields.string({ required: true, password: true })
        }
      })
    ],
    render(message = "Not signed in.") {
      return {
        auth_status: `Current status: ${message}

<!-- agent:begin id="login_status_prompt" -->
## Context
This block reports the current authentication status for the login page.

## Result
${message}
<!-- agent:end -->`,
        login: `Sign in with your username and password, or create a new account.

<!-- agent:begin id="login_block_prompt" -->
## Context
Use this block to sign in with a username and password or navigate to registration.

## Result
Submit valid credentials to continue to the guestbook, or open the register page.
<!-- agent:end -->`
      };
    }
  });
  const registerPage = app.page("/register", {
    markdown: assets.registerMarkdown,
    actions: [
      actions.navigate("open_login", {
        label: "Back to Sign In",
        target: "/login"
      }),
      actions.write("register", {
        label: "Create Account",
        target: "/auth/register",
        input: {
          username: fields.string({ required: true }),
          password: fields.string({ required: true, password: true })
        }
      })
    ],
    render(message = "Create a new account.") {
      return {
        register_status: `Current status: ${message}

<!-- agent:begin id="register_status_prompt" -->
## Context
This block reports the current registration status for the register page.

## Result
${message}
<!-- agent:end -->`,
        register: `Create an account with a username and password, or return to sign in.

<!-- agent:begin id="register_block_prompt" -->
## Context
Use this block to create an account with a username and password or navigate back to sign in.

## Result
Submit valid registration data to continue to the guestbook, or open the login page.
<!-- agent:end -->`
      };
    }
  });
  const guestbookPage = app.page("/guestbook", {
    markdown: assets.guestbookMarkdown,
    actions: [
      actions.read("refresh_messages", {
        label: "Refresh",
        target: "/guestbook"
      }),
      actions.write("submit_message", {
        label: "Submit Message",
        target: "/guestbook/post",
        input: {
          message: fields.string({ required: true })
        }
      }),
      actions.write("logout", {
        label: "Log Out",
        target: "/guestbook/logout"
      })
    ],
    render(username: string, currentMessages: MessageEntry[]) {
      const lines = currentMessages.length > 0
        ? currentMessages.map((entry) => `- ${entry.username}: ${entry.text}`).join("\n")
        : "- No messages yet";
      return {
        session_status: `Signed in as ${username}

<!-- agent:begin id="session_status_prompt" -->
## Context
This block reports the authenticated session identity for the current guestbook page.

## Result
Signed in as ${username}
<!-- agent:end -->`,
        messages: `${lines}

<!-- agent:begin id="messages_block_prompt" -->
## Context
This block shows the current authenticated guestbook feed.

## Result
${lines}
<!-- agent:end -->`,
        composer: `Add a message to the guestbook.

<!-- agent:begin id="composer_block_prompt" -->
## Context
Use this block to submit a new guestbook message while signed in.

## Result
A valid submission adds a new message to the top of the guestbook feed.
<!-- agent:end -->`,
        session_actions: `Sign out when you are done.

<!-- agent:begin id="session_actions_prompt" -->
## Context
Use this block to end the current authenticated session.

## Result
Signing out returns the surface to the login route.
<!-- agent:end -->`
      };
    }
  });

  app.route(loginPage);

  app.route(registerPage);

  app.route("/guestbook", async ({ session }) => {
    const username = typeof session?.username === "string" ? session.username : "";
    if (!username) {
      return loginPage.bind("Please sign in first.").render();
    }
    return guestbookPage.bind(username, messages).render();
  });

  app.action("/auth/login", async ({ inputs }) => {
    const username = (inputs.username ?? "").trim();
    const password = inputs.password ?? "";
    if (!username || !password || users.get(username) !== password) {
      return {
        status: 401,
        ...loginPage.bind("Login rejected. Check username and password.").render()
      };
    }
    const sid = randomUUID();
    return {
      session: signIn({ sid, username }),
      ...guestbookPage.bind(username, messages).render()
    };
  });

  app.action("/auth/register", async ({ inputs }) => {
    const username = (inputs.username ?? "").trim();
    const password = inputs.password ?? "";
    if (!username || !password) {
      return {
        status: 400,
        ...registerPage.bind("Invalid input. Username and password are required.").render()
      };
    }
    if (users.has(username)) {
      return {
        status: 409,
        ...registerPage.bind("Username already exists. Try another username or sign in.").render()
      };
    }
    users.set(username, password);
    const sid = randomUUID();
    return {
      session: signIn({ sid, username }),
      ...guestbookPage.bind(username, messages).render()
    };
  });

  app.action("/guestbook/post", async ({ inputs, session }) => {
    const username = typeof session?.username === "string" ? session.username : "";
    if (!username) {
      return {
        status: 401,
        ...loginPage.bind("Sign in required. Open /login and sign in.").render()
      };
    }
    const message = (inputs.message ?? "").trim();
    if (!message) {
      return {
        status: 400,
        ...guestbookPage.bind(username, messages).render()
      };
    }
    messages.unshift({ username, text: message });
    return guestbookPage.bind(username, messages).render();
  });

  app.action("/guestbook/logout", async () => ({
    session: signOut(),
    ...loginPage.bind("Signed out.").render()
  }));

  return app;
}
