import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createMdanServer, signIn, signOut, type BrowserShellOptions } from "@mdanai/sdk/server";

type SessionState = {
  sid: string;
  username: string;
};

type MessageEntry = {
  username: string;
  text: string;
};

type JsonActionSpec = {
  app_id: string;
  state_id: string;
  state_version: number;
  response_mode: "page";
  blocks: string[];
  actions: Array<Record<string, unknown>>;
  allowed_next_actions: string[];
};

type JsonEnvelope = {
  content: string;
  actions: JsonActionSpec;
  view: {
    route_path: string;
    regions: Record<string, string>;
  };
};

type ExampleAssets = {
  loginMarkdown: string;
  registerMarkdown: string;
  guestbookMarkdown: string;
  loginActions: JsonActionSpec;
  registerActions: JsonActionSpec;
  guestbookActions: JsonActionSpec;
};

function loadText(path: string): string {
  return readFileSync(path, "utf8");
}

function loadJson<T>(path: string): T {
  return JSON.parse(loadText(path)) as T;
}

function loadExampleAssets(): ExampleAssets {
  const exampleRoot = dirname(fileURLToPath(import.meta.url));
  const appDir = join(exampleRoot, "app");
  const actionsDir = join(appDir, "actions");

  return {
    loginMarkdown: loadText(join(appDir, "login.md")),
    registerMarkdown: loadText(join(appDir, "register.md")),
    guestbookMarkdown: loadText(join(appDir, "guestbook.md")),
    loginActions: loadJson<JsonActionSpec>(join(actionsDir, "login.json")),
    registerActions: loadJson<JsonActionSpec>(join(actionsDir, "register.json")),
    guestbookActions: loadJson<JsonActionSpec>(join(actionsDir, "guestbook.json"))
  };
}

const assets = loadExampleAssets();

function deepCloneActionSpec(spec: JsonActionSpec): JsonActionSpec {
  return JSON.parse(JSON.stringify(spec)) as JsonActionSpec;
}

function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/:::\s*block\{([^}]*)\}\n:::/g, (full, attrs: string) => {
    const rawId = attrs.match(/\bid="([^"]+)"/)?.[1];
    const id = rawId?.replace(/\\_/g, "_");
    if (!id || !(id in values)) {
      return full;
    }
    return `::: block{${attrs}}\n${values[id] ?? ""}\n:::`;
  });
}

function contentWithFrontmatter(stateId: string, stateVersion: number, actionsRef: string, body: string): string {
  return `---
app_id: "auth-guestbook"
state_id: "${stateId}"
state_version: ${stateVersion}
actions: "${actionsRef}"
response_mode: "page"
---

${body}`.trim();
}

function loginEnvelope(message = "Not signed in."): JsonEnvelope {
  const stateId = "auth-guestbook:login:1";
  const stateVersion = 1;
  const body = renderTemplate(assets.loginMarkdown, {
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
  });

  const actionSpec = deepCloneActionSpec(assets.loginActions);
  actionSpec.state_id = stateId;
  actionSpec.state_version = stateVersion;

  return {
    content: contentWithFrontmatter(stateId, stateVersion, "./app/actions/login.json", body),
    actions: actionSpec,
    view: {
      route_path: "/login",
      regions: {
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
      }
    }
  };
}

function registerEnvelope(message = "Create a new account."): JsonEnvelope {
  const stateId = "auth-guestbook:register:2";
  const stateVersion = 1;
  const body = renderTemplate(assets.registerMarkdown, {
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
  });

  const actionSpec = deepCloneActionSpec(assets.registerActions);
  actionSpec.state_id = stateId;
  actionSpec.state_version = stateVersion;

  return {
    content: contentWithFrontmatter(stateId, stateVersion, "./app/actions/register.json", body),
    actions: actionSpec,
    view: {
      route_path: "/register",
      regions: {
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
      }
    }
  };
}

function guestbookEnvelope(username: string, messages: MessageEntry[]): JsonEnvelope {
  const stateVersion = messages.length + 3;
  const stateId = `auth-guestbook:guestbook:${stateVersion}`;
  const lines = messages.length > 0 ? messages.map((entry) => `- ${entry.username}: ${entry.text}`).join("\n") : "- No messages yet";

  const body = renderTemplate(assets.guestbookMarkdown, {
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
  });

  const actionSpec = deepCloneActionSpec(assets.guestbookActions);
  actionSpec.state_id = stateId;
  actionSpec.state_version = stateVersion;

  return {
    content: contentWithFrontmatter(stateId, stateVersion, "./app/actions/guestbook.json", body),
    actions: actionSpec,
    view: {
      route_path: "/guestbook",
      regions: {
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
      }
    }
  };
}

export function createAuthGuestbookServer(browserShell: BrowserShellOptions = { moduleMode: "local-dist" }) {
  const users = new Map<string, string>();
  const sessions = new Map<string, SessionState>();
  const messages: MessageEntry[] = [];

  const server = createMdanServer({
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

  server.page("/login", async () => loginEnvelope());

  server.page("/register", async () => registerEnvelope());

  server.page("/guestbook", async ({ session }) => {
    const username = typeof session?.username === "string" ? session.username : "";
    if (!username) {
      return loginEnvelope("Please sign in first.");
    }
    return guestbookEnvelope(username, messages);
  });

  server.post("/auth/login", async ({ inputs }) => {
    const username = (inputs.username ?? "").trim();
    const password = inputs.password ?? "";
    if (!username || !password || users.get(username) !== password) {
      return {
        status: 401,
        route: "/login",
        ...loginEnvelope("Login rejected. Check username and password.")
      };
    }
    const sid = randomUUID();
    return {
      session: signIn({ sid, username }),
      route: "/guestbook",
      ...guestbookEnvelope(username, messages)
    };
  });

  server.post("/auth/register", async ({ inputs }) => {
    const username = (inputs.username ?? "").trim();
    const password = inputs.password ?? "";
    if (!username || !password) {
      return {
        status: 400,
        route: "/register",
        ...registerEnvelope("Invalid input. Username and password are required.")
      };
    }
    if (users.has(username)) {
      return {
        status: 409,
        route: "/register",
        ...registerEnvelope("Username already exists. Try another username or sign in.")
      };
    }
    users.set(username, password);
    const sid = randomUUID();
    return {
      session: signIn({ sid, username }),
      route: "/guestbook",
      ...guestbookEnvelope(username, messages)
    };
  });

  server.post("/guestbook/post", async ({ inputs, session }) => {
    const username = typeof session?.username === "string" ? session.username : "";
    if (!username) {
      return {
        status: 401,
        route: "/login",
        ...loginEnvelope("Sign in required. Open /login and sign in.")
      };
    }
    const message = (inputs.message ?? "").trim();
    if (!message) {
      return {
        status: 400,
        route: "/guestbook",
        ...guestbookEnvelope(username, messages)
      };
    }
    messages.unshift({ username, text: message });
    return {
      route: "/guestbook",
      ...guestbookEnvelope(username, messages)
    };
  });

  server.post("/guestbook/logout", async () => ({
    session: signOut(),
    route: "/login",
    ...loginEnvelope("Signed out.")
  }));

  return server;
}
