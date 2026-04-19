import { describe, expect, it } from "vitest";

import { MdanRouter, matchRoutePattern } from "../../src/server/router.js";

describe("matchRoutePattern", () => {
  it("matches exact static path", () => {
    expect(matchRoutePattern("/auth/login", "/auth/login")).toEqual({});
  });

  it("extracts named params", () => {
    expect(matchRoutePattern("/users/:id/posts/:postId", "/users/42/posts/88")).toEqual({
      id: "42",
      postId: "88"
    });
  });

  it("decodes percent-encoded dynamic params", () => {
    expect(matchRoutePattern("/users/:id", "/users/alice%20bob")).toEqual({
      id: "alice bob"
    });
  });

  it("returns null for different segment counts", () => {
    expect(matchRoutePattern("/users/:id", "/users/42/posts")).toBeNull();
  });

  it("returns null for non-matching static segments", () => {
    expect(matchRoutePattern("/users/:id", "/accounts/42")).toBeNull();
  });

  it("returns null for empty param key", () => {
    expect(matchRoutePattern("/users/:", "/users/42")).toBeNull();
  });
});

describe("MdanRouter", () => {
  it("resolves GET and POST handlers independently", () => {
    const router = new MdanRouter();
    const getHandler = () => ({ status: 200 } as const);
    const postHandler = () => ({ status: 200 } as const);

    router.get("/guestbook", getHandler as never);
    router.post("/guestbook", postHandler as never);

    expect(router.resolve("GET", "/guestbook")?.handler).toBe(getHandler);
    expect(router.resolve("POST", "/guestbook")?.handler).toBe(postHandler);
  });

  it("resolves dynamic route params", () => {
    const router = new MdanRouter();
    const handler = () => ({ status: 200 } as const);
    router.get("/users/:id", handler as never);

    const match = router.resolve("GET", "/users/ada");
    expect(match?.params).toEqual({ id: "ada" });
    expect(match?.routePath).toBe("/users/:id");
  });

  it("returns undefined for unknown routes", () => {
    const router = new MdanRouter();
    expect(router.resolve("GET", "/missing")).toBeUndefined();
    expect(router.resolvePage("/missing")).toBeUndefined();
  });

  it("resolves page handlers separately from action handlers", () => {
    const router = new MdanRouter();
    const page = () => ({ content: "x", actions: {} } as never);
    router.page("/auth/login", page);

    const pageMatch = router.resolvePage("/auth/login");
    expect(pageMatch?.handler).toBe(page);
    expect(pageMatch?.params).toEqual({});
  });

  it("matches first registered route for identical patterns", () => {
    const router = new MdanRouter();
    const first = () => ({ status: 200 } as const);
    const second = () => ({ status: 200 } as const);

    router.get("/conflict", first as never);
    router.get("/conflict", second as never);

    expect(router.resolve("GET", "/conflict")?.handler).toBe(first);
  });
});
