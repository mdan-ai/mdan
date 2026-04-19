import { describe, expect, it } from "vitest";

import { createMdanServer, signIn, signOut } from "../../src/server/index.js";

function pageEnvelope(routePath: string, title: string, body: string) {
  return {
    content: `---
app_id: "auth-guestbook"
state_id: "auth-guestbook:${routePath}:1"
state_version: 1
---

# ${title}

::: block{id="main" actions="noop"}
${body}
:::`,
    actions: {
      app_id: "auth-guestbook",
      state_id: `auth-guestbook:${routePath}:1`,
      state_version: 1,
      blocks: ["main"],
      actions: [
        {
          id: "noop",
          label: "Noop",
          verb: "read",
          target: routePath
        }
      ]
    },
    view: {
      route_path: routePath,
      regions: {
        main: body
      }
    }
  };
}

describe("createMdanServer JSON surface session isolation", () => {
  it("keeps two account sessions isolated when login/logout interleave", async () => {
    const sessions = new Map<string, { sid: string; username: string }>();

	    const server = createMdanServer({
	      actionProof: { disabled: true },
	      session: {
        async read(request) {
          const sid = request.cookies.sid;
          if (!sid) {
            return null;
          }
          return sessions.get(sid) ?? null;
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
          response.headers["set-cookie"] = `sid=${sid}; Path=/; HttpOnly`;
        },
        async clear(_session, response, request) {
          const sid = request.cookies.sid;
          if (sid) {
            sessions.delete(sid);
          }
          response.headers["set-cookie"] = "sid=; Path=/; Max-Age=0; HttpOnly";
        }
      }
    });

    server.post("/auth/login", async ({ inputs }) => {
      const username = inputs.username ?? "";
      if (!username) {
        return {
          status: 400,
          route: "/login",
          ...pageEnvelope("/login", "Sign In", "Missing username")
        };
      }
      const sid = `sid-${username}`;
      return {
        ...pageEnvelope("/guestbook", "Guestbook", `Logged in as ${username}`),
        route: "/guestbook",
        session: signIn({ sid, username })
      };
    });

    server.post("/guestbook/post", async ({ session, inputs }) => {
      const username = typeof session?.username === "string" ? session.username : "";
      if (!username) {
        return {
          status: 401,
          route: "/login",
          ...pageEnvelope("/login", "Sign In", "Sign in required")
        };
      }
      const message = inputs.message ?? "";
      return pageEnvelope("/guestbook", "Guestbook", `${username}: ${message}`);
    });

    server.post("/guestbook/logout", async () => ({
      ...pageEnvelope("/login", "Sign In", "Please log in again."),
      route: "/login",
      session: signOut()
    }));

    const loginA = await server.handle({
      method: "POST",
      url: "https://example.test/auth/login",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: '{"username":"alice"}',
      cookies: {}
    });
    const cookieA = loginA.headers["set-cookie"];
    expect(cookieA).toContain("sid=sid-alice");

    const loginB = await server.handle({
      method: "POST",
      url: "https://example.test/auth/login",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: '{"username":"bob"}',
      cookies: {}
    });
    const cookieB = loginB.headers["set-cookie"];
    expect(cookieB).toContain("sid=sid-bob");

    const postA = await server.handle({
      method: "POST",
      url: "https://example.test/guestbook/post",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: '{"message":"hello from a"}',
      cookies: {
        sid: "sid-alice"
      }
    });
    expect(postA.status).toBe(200);
    expect(String(postA.body)).toContain("alice: hello from a");

    const logoutB = await server.handle({
      method: "POST",
      url: "https://example.test/guestbook/logout",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: "",
      cookies: {
        sid: "sid-bob"
      }
    });
    expect(logoutB.status).toBe(200);
    expect(logoutB.headers["set-cookie"]).toContain("Max-Age=0");

    const postB = await server.handle({
      method: "POST",
      url: "https://example.test/guestbook/post",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: '{"message":"hello from b"}',
      cookies: {
        sid: "sid-bob"
      }
    });
    expect(postB.status).toBe(401);
    expect(String(postB.body)).toContain("Sign in required");

    const postAAgain = await server.handle({
      method: "POST",
      url: "https://example.test/guestbook/post",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: '{"message":"still works"}',
      cookies: {
        sid: "sid-alice"
      }
    });
    expect(postAAgain.status).toBe(200);
    expect(String(postAAgain.body)).toContain("alice: still works");
  });
});
