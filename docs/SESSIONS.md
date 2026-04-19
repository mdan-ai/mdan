# Sessions

The server runtime has a small session mutation contract. It does not prescribe
where sessions live or how cookies are signed; hosts provide those details
through `MdanSessionProvider`.

## Provider Contract

Configure sessions with:

```ts
const sessions = new Map<string, { sid: string; username: string }>();

const server = createMdanServer({
  session: {
    async read(request) {
      const sid = request.cookies.mdan_session;
      return sid ? sessions.get(sid) ?? null : null;
    },
    async commit(mutation, response) {
      if (!mutation || mutation.type === "sign-out") {
        return;
      }
      const sid = String(mutation.session.sid ?? "");
      if (!sid) {
        return;
      }
      sessions.set(sid, mutation.session as { sid: string; username: string });
      response.headers["set-cookie"] =
        `mdan_session=${encodeURIComponent(sid)}; Path=/; HttpOnly; SameSite=Lax`;
    },
    async clear(session, response) {
      if (typeof session?.sid === "string") {
        sessions.delete(session.sid);
      }
      response.headers["set-cookie"] =
        "mdan_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
    }
  }
});
```

The runtime calls:

- `read(request)` before page and action handlers
- `commit(mutation, response)` after successful sign-in or refresh results
- `clear(session, response, request)` after sign-out results

## Session Mutations

Handlers return session mutations with helpers:

```ts
import { signIn, signOut } from "@mdanai/sdk/server";

server.post("/auth/login", async ({ inputs }) => {
  const sid = crypto.randomUUID();
  const username = String(inputs.username ?? "");

  return {
    session: signIn({ sid, username }),
    route: "/guestbook",
    content: "# Guestbook",
    actions: {
      app_id: "auth-demo",
      state_id: "auth-demo:guestbook",
      state_version: 1,
      blocks: [],
      actions: []
    },
    view: {
      route_path: "/guestbook",
      regions: {}
    }
  };
});

server.post("/auth/logout", async () => ({
  session: signOut(),
  route: "/login",
  content: "# Signed out",
  actions: {
    app_id: "auth-demo",
    state_id: "auth-demo:login",
    state_version: 1,
    blocks: [],
    actions: []
  },
  view: {
    route_path: "/login",
    regions: {}
  }
}));
```

`refreshSession(session)` is available for handlers that want to re-commit the
current session snapshot.

## Handler Access

Page and action handlers receive the current session snapshot:

```ts
server.page("/guestbook", async ({ session }) => {
  if (!session?.username) {
    return loginSurface("Please sign in first.");
  }
  return guestbookSurface(String(session.username));
});

server.post("/guestbook/post", async ({ session, inputs }) => {
  if (!session?.username) {
    return {
      status: 401,
      route: "/login",
      ...loginSurface("Sign in required.")
    };
  }
  return appendMessage(String(session.username), String(inputs.message ?? ""));
});
```

## Boundaries

Session handling is separate from action proof:

- sessions answer "who is making this request?"
- action proof answers "did this request follow an action the server issued?"

Use both for authenticated actions. Action proof does not replace authorization,
and session checks do not prove that an agent followed the current page's
declared action contract.
