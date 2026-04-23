import { describe, expect, it } from "vitest";

import { createAuthGuestbookServer } from "../../examples/auth-guestbook/app.js";
import { parseFrontmatter } from "../../src/content/content-actions.js";

type MarkdownActions = {
  allowed_next_actions?: string[];
  actions?: Array<Record<string, unknown>>;
};

type MarkdownSurface = {
  content: string;
  route?: string;
  actions: MarkdownActions;
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

async function proofForAction(
  server: ReturnType<typeof createAuthGuestbookServer>,
  path: string,
  actionId: string,
  cookies: Record<string, string> = {}
): Promise<string> {
  const response = await server.handle({
    method: "GET",
    url: `https://example.test${path}`,
    headers: {
      accept: "text/markdown"
    },
    cookies
  });
  const payload = parseMarkdownResponse(response);
  const action = payload.actions.actions?.find((candidate) => candidate.id === actionId);
  return String(action.action_proof);
}

function parseMarkdownResponse(response: { headers: Record<string, string>; body: string | AsyncIterable<string> }): MarkdownSurface {
  expect(response.headers["content-type"]).toContain("text/markdown");
  expect(typeof response.body).toBe("string");
  const content = String(response.body);
  const frontmatter = parseFrontmatter(content);
  const match = content.match(/```mdan\n([\s\S]*?)\n```/);
  expect(match?.[1]).toBeTruthy();
  return {
    content,
    ...(typeof frontmatter.route === "string" ? { route: frontmatter.route } : {}),
    actions: JSON.parse(String(match?.[1])) as MarkdownActions
  };
}

function actionBody(proof: string, input: Record<string, unknown>) {
  return JSON.stringify({
    action: {
      proof
    },
    input
  });
}

describe("auth-guestbook markdown example", () => {
	  it("supports register -> post -> logout -> login -> post flow with isolated sessions", async () => {
	    const server = createAuthGuestbookServer();
	    const registerAliceProof = await proofForAction(server, "/register", "register");

	    const registerAlice = await server.handle({
      method: "POST",
      url: "https://example.test/auth/register",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
	      body: actionBody(registerAliceProof, { username: "alice", password: "a1" }),
      cookies: {}
    });
    expect(registerAlice.status).toBe(200);
	    const aliceCookie = cookieValue(registerAlice.headers["set-cookie"]);
	    expect(aliceCookie).toContain("mdan_session=");
	    const aliceRegisterResponse = parseMarkdownResponse(registerAlice);
	    expect(aliceRegisterResponse.content).toContain("# Guestbook");
	    const aliceSubmitProof = aliceRegisterResponse.actions.actions?.find(
	      (action: { id?: string }) => action.id === "submit_message"
	    ).action_proof;

	    const postAlice = await server.handle({
      method: "POST",
      url: "https://example.test/guestbook/post",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
	      body: actionBody(aliceSubmitProof, { message: "hello from alice" }),
      cookies: cookieMap(aliceCookie)
    });
	    expect(postAlice.status).toBe(200);
	    const postAliceResponse = parseMarkdownResponse(postAlice);
	    expect(postAliceResponse.content).toContain("hello from alice");
	    const aliceLogoutProof = postAliceResponse.actions.actions?.find(
	      (action: { id?: string }) => action.id === "logout"
	    ).action_proof;

	    const logoutAlice = await server.handle({
      method: "POST",
      url: "https://example.test/guestbook/logout",
	      headers: {
	        accept: "text/markdown",
	        "content-type": "application/json"
	      },
	      body: actionBody(aliceLogoutProof, {}),
	      cookies: cookieMap(aliceCookie)
	    });
    expect(logoutAlice.status).toBe(200);
    expect(logoutAlice.headers["set-cookie"]).toContain("Max-Age=0");
    expect(parseMarkdownResponse(logoutAlice).content).toContain("# Sign In");

	    const registerBobProof = await proofForAction(server, "/register", "register");
	    const registerBob = await server.handle({
      method: "POST",
      url: "https://example.test/auth/register",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
	      body: actionBody(registerBobProof, { username: "bob", password: "b1" }),
      cookies: {}
    });
	    expect(registerBob.status).toBe(200);
	    const bobCookie = cookieValue(registerBob.headers["set-cookie"]);
	    expect(bobCookie).toContain("mdan_session=");
	    const bobRegisterResponse = parseMarkdownResponse(registerBob);
	    const bobSubmitProof = bobRegisterResponse.actions.actions?.find(
	      (action: { id?: string }) => action.id === "submit_message"
	    ).action_proof;

	    const postBob = await server.handle({
      method: "POST",
      url: "https://example.test/guestbook/post",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
	      body: actionBody(bobSubmitProof, { message: "hello from bob" }),
      cookies: cookieMap(bobCookie)
    });
	    expect(postBob.status).toBe(200);
	    expect(parseMarkdownResponse(postBob).content).toContain("hello from bob");
	    const loginAliceProof = await proofForAction(server, "/login", "login");

	    const loginAliceAgain = await server.handle({
      method: "POST",
      url: "https://example.test/auth/login",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
	      body: actionBody(loginAliceProof, { username: "alice", password: "a1" }),
      cookies: {}
    });
    expect(loginAliceAgain.status).toBe(200);
	    const aliceCookie2 = cookieValue(loginAliceAgain.headers["set-cookie"]);
	    expect(aliceCookie2).toContain("mdan_session=");
	    const aliceLoginResponse = parseMarkdownResponse(loginAliceAgain);
	    const aliceSubmitProof2 = aliceLoginResponse.actions.actions?.find(
	      (action: { id?: string }) => action.id === "submit_message"
	    ).action_proof;

	    const postAliceAgain = await server.handle({
      method: "POST",
      url: "https://example.test/guestbook/post",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
	      body: actionBody(aliceSubmitProof2, { message: "alice is back" }),
      cookies: cookieMap(aliceCookie2)
    });
    expect(postAliceAgain.status).toBe(200);
    expect(parseMarkdownResponse(postAliceAgain).content).toContain("alice is back");

    const postWithOldAliceCookie = await server.handle({
      method: "POST",
      url: "https://example.test/guestbook/post",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
	      body: actionBody(aliceSubmitProof, { message: "should fail" }),
      cookies: cookieMap(aliceCookie)
    });
    expect(postWithOldAliceCookie.status).toBe(401);
    expect(parseMarkdownResponse(postWithOldAliceCookie).content).toContain("Sign in required");
  });

  it("renders html for page requests, keeps page markdown fetchable, and keeps block updates off html/markdown paths", async () => {
    const server = createAuthGuestbookServer();

    const loginPage = await server.handle({
      method: "GET",
      url: "https://example.test/login",
      headers: {
        accept: "text/html"
      },
      cookies: {}
    });

    expect(loginPage.status).toBe(200);
    expect(loginPage.headers["content-type"]).toBe("text/html");
    expect(String(loginPage.body)).toContain("<!doctype html>");
    expect(String(loginPage.body)).toContain("<h1>Sign In</h1>");
    expect(String(loginPage.body)).not.toContain('id="mdan-initial-surface"');

    const loginMarkdown = await server.handle({
      method: "GET",
      url: "https://example.test/login",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(loginMarkdown.status).toBe(200);
    expect(loginMarkdown.headers["content-type"]).toContain("text/markdown");
    expect(String(loginMarkdown.body)).toContain("# Sign In");

    const registerHtml = await server.handle({
      method: "POST",
      url: "https://example.test/auth/register",
      headers: {
        accept: "text/html",
        "content-type": "application/json"
      },
      body: '{"username":"ada","password":"pw"}',
      cookies: {}
    });

    expect(registerHtml.status).toBe(406);
    expect(registerHtml.headers["content-type"]).toContain("text/markdown");
    expect(String(registerHtml.body)).toContain("Not Acceptable");

    const registerMarkdown = await server.handle({
      method: "POST",
      url: "https://example.test/auth/register",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: '{"username":"ada-md","password":"pw"}',
      cookies: {}
    });

    expect(registerMarkdown.status).toBe(400);
    expect(String(registerMarkdown.body)).toContain("Invalid Action Request");
  });

	  it("returns guestbook markdown actions with the expected page and action targets", async () => {
	    const server = createAuthGuestbookServer();
	    const registerProof = await proofForAction(server, "/register", "register");

	    const register = await server.handle({
      method: "POST",
      url: "https://example.test/auth/register",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
	      body: actionBody(registerProof, { username: "html-check", password: "pw" }),
      cookies: {}
    });

    const sessionCookie = cookieValue(register.headers["set-cookie"]);
    const guestbookPage = await server.handle({
      method: "GET",
      url: "https://example.test/guestbook",
      headers: {
        accept: "text/markdown"
      },
      cookies: cookieMap(sessionCookie)
    });

    const payload = parseMarkdownResponse(guestbookPage);
    expect(payload.actions.actions?.map((action: { target: string }) => action.target)).toEqual([
      "/guestbook",
      "/guestbook/post",
      "/guestbook/logout"
    ]);
  });
});
