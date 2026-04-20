import { describe, expect, it } from "vitest";

import { createAuthGuestbookServer } from "../../examples/auth-guestbook/app.js";
import type { MdanResponse } from "../../src/server/index.js";
import { parseFrontmatter } from "../../src/content/content-actions.js";

type ArtifactActions = {
  allowed_next_actions?: string[];
  actions?: Array<Record<string, unknown>>;
};

type ArtifactSurface = {
  content: string;
  route?: string;
  actions: ArtifactActions;
};

function cookieValue(setCookie: string | undefined): string {
  return (setCookie ?? "").split(";", 1)[0] ?? "";
}

function cookieMap(cookieHeader: string): Record<string, string> {
  const [name, value] = cookieHeader.split("=", 2);
  if (!name || !value) {
    return {};
  }
  return {
    [name]: decodeURIComponent(value)
  };
}

function parseAgentSurface(response: MdanResponse): ArtifactSurface {
  expect(response.headers["content-type"]).toContain("text/markdown");
  expect(typeof response.body).toBe("string");
  const content = String(response.body);
  const frontmatter = parseFrontmatter(content);
  const match = content.match(/```mdan\n([\s\S]*?)\n```/);
  expect(match?.[1]).toBeTruthy();
  return {
    content,
    ...(typeof frontmatter.route === "string" ? { route: frontmatter.route } : {}),
    actions: JSON.parse(String(match?.[1])) as ArtifactActions
  };
}

function expectAction(surface: ArtifactSurface, id: string) {
  const action = surface.actions.actions?.find((candidate) => candidate.id === id);
  expect(action).toBeTruthy();
  return action!;
}

async function getSurface(
  server: ReturnType<typeof createAuthGuestbookServer>,
  path: string,
  cookies: Record<string, string> = {}
): Promise<ArtifactSurface> {
  const response = await server.handle({
    method: "GET",
    url: `https://example.test${path}`,
    headers: {
      accept: "text/markdown"
    },
    cookies
  });
  expect(response.status).toBe(200);
  return parseAgentSurface(response);
}

function actionBody(action: { action_proof?: unknown }, input: Record<string, unknown>) {
  expect(action.action_proof).toBeTypeOf("string");
  return JSON.stringify({
    action: {
      proof: String(action.action_proof)
    },
    input
  });
}

describe("auth-guestbook agent consumption", () => {
  it("supports register, post, logout, and rejected old-session submit through markdown artifacts", async () => {
    const server = createAuthGuestbookServer();

    const loginPage = await server.handle({
      method: "GET",
      url: "https://example.test/login",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });
    expect(loginPage.status).toBe(200);
    const loginSurface = parseAgentSurface(loginPage);
    const loginAction = expectAction(loginSurface, "login");
    const openRegisterAction = expectAction(loginSurface, "open_register");
    expect(loginSurface.content).toContain("# Sign In");
    expect(loginSurface.actions.allowed_next_actions).toEqual(["login", "open_register"]);
    expect(loginAction.target).toBe("/auth/login");
    expect(loginAction.transport?.method).toBe("POST");
    expect(loginAction.input_schema?.required).toEqual(["username", "password"]);
    expect(openRegisterAction.target).toBe("/register");

    const registerPage = await server.handle({
      method: "GET",
      url: "https://example.test/register",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });
    expect(registerPage.status).toBe(200);
    const registerSurface = parseAgentSurface(registerPage);
    const registerAction = expectAction(registerSurface, "register");
    expect(registerAction.target).toBe("/auth/register");
    expect(registerAction.transport?.method).toBe("POST");
    expect(registerAction.input_schema?.required).toEqual(["username", "password"]);

    const register = await server.handle({
      method: "POST",
      url: "https://example.test/auth/register",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: actionBody(registerAction, { username: "agent", password: "pw" }),
      cookies: {}
    });
    expect(register.status).toBe(200);
    const sessionCookie = cookieValue(register.headers["set-cookie"]);
    expect(sessionCookie).toContain("mdan_session=");
    const registeredSurface = parseAgentSurface(register);
    expect(registeredSurface.content).toContain("# Guestbook");

    const guestbook = await server.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: {
        accept: "text/markdown"
      },
      cookies: cookieMap(sessionCookie)
    });
    expect(guestbook.status).toBe(200);
    const guestbookSurface = parseAgentSurface(guestbook);
    expect(guestbookSurface.content).toContain("# Guestbook");
    expect(guestbookSurface.actions.allowed_next_actions).toEqual(["refresh_messages", "submit_message", "logout"]);
    const submitMessageAction = expectAction(guestbookSurface, "submit_message");
    const logoutAction = expectAction(guestbookSurface, "logout");
    expect(submitMessageAction.target).toBe("/guestbook/post");
    expect(expectAction(guestbookSurface, "refresh_messages").target).toBe("/guestbook");
    expect(logoutAction.target).toBe("/guestbook/logout");

    const post = await server.handle({
      method: "POST",
      url: "https://example.test/guestbook/post",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: actionBody(submitMessageAction, { message: "hello from a direct agent" }),
      cookies: cookieMap(sessionCookie)
    });
    expect(post.status).toBe(200);
    const postSurface = parseAgentSurface(post);
    expect(postSurface.content).toContain("hello from a direct agent");

    const logout = await server.handle({
      method: "POST",
      url: "https://example.test/guestbook/logout",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: actionBody(logoutAction, {}),
      cookies: cookieMap(sessionCookie)
    });
    expect(logout.status).toBe(200);
    expect(logout.headers["set-cookie"]).toContain("Max-Age=0");
    const logoutSurface = parseAgentSurface(logout);
    expect(logoutSurface.content).toContain("# Sign In");

    const rejectedOldSessionPost = await server.handle({
      method: "POST",
      url: "https://example.test/guestbook/post",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: actionBody(submitMessageAction, { message: "should fail" }),
      cookies: cookieMap(sessionCookie)
    });
    expect(rejectedOldSessionPost.status).toBe(401);
    const rejectedSurface = parseAgentSurface(rejectedOldSessionPost);
    expect(rejectedSurface.content).toContain("Sign in required");
  });

  it("keeps common auth and validation failures agent-readable", async () => {
    const server = createAuthGuestbookServer();
    const loginSurface = await getSurface(server, "/login");
    const loginAction = expectAction(loginSurface, "login");
    const registerSurface = await getSurface(server, "/register");
    const registerAction = expectAction(registerSurface, "register");

    const invalidLogin = await server.handle({
      method: "POST",
      url: "https://example.test/auth/login",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: actionBody(loginAction, { username: "missing", password: "bad" }),
      cookies: {}
    });
    expect(invalidLogin.status).toBe(401);
    const invalidLoginSurface = parseAgentSurface(invalidLogin);
    expect(invalidLoginSurface.content).toContain("Login rejected");
    expect(invalidLoginSurface.actions.allowed_next_actions).toEqual(["login", "open_register"]);

    const missingRegisterInput = await server.handle({
      method: "POST",
      url: "https://example.test/auth/register",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: actionBody(registerAction, { username: "", password: "" }),
      cookies: {}
    });
    expect(missingRegisterInput.status).toBe(400);
    const missingRegisterSurface = parseAgentSurface(missingRegisterInput);
    expect(missingRegisterSurface.content).toContain("Invalid input");
    expect(missingRegisterSurface.actions.allowed_next_actions).toEqual(["register", "open_login"]);

    const register = await server.handle({
      method: "POST",
      url: "https://example.test/auth/register",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: actionBody(registerAction, { username: "duplicate", password: "pw" }),
      cookies: {}
    });
    expect(register.status).toBe(200);

    const duplicateRegister = await server.handle({
      method: "POST",
      url: "https://example.test/auth/register",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: actionBody(registerAction, { username: "duplicate", password: "pw" }),
      cookies: {}
    });
    expect(duplicateRegister.status).toBe(409);
    const duplicateSurface = parseAgentSurface(duplicateRegister);
    expect(duplicateSurface.content).toContain("Username already exists");

    const duplicateCookie = cookieValue(register.headers["set-cookie"]);
    const signedInGuestbookSurface = await getSurface(server, "/guestbook", cookieMap(duplicateCookie));
    const unauthenticatedSubmitAction = expectAction(signedInGuestbookSurface, "submit_message");
    const unauthenticatedWrite = await server.handle({
      method: "POST",
      url: "https://example.test/guestbook/post",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: actionBody(unauthenticatedSubmitAction, { message: "not signed in" }),
      cookies: {}
    });
    expect(unauthenticatedWrite.status).toBe(401);
    const unauthenticatedSurface = parseAgentSurface(unauthenticatedWrite);
    expect(unauthenticatedSurface.content).toContain("Sign in required");
  });
});
