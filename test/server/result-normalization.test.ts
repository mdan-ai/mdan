import { describe, expect, it } from "vitest";

import {
  normalizeActionHandlerResultLike,
  normalizeActionHandlerResult,
  normalizePageHandlerResult,
  pageResultToActionResult
} from "../../src/server/result-normalization.js";

describe("result normalization", () => {
  it("normalizes readable surfaces into artifact-native action results", () => {
    const result = normalizeActionHandlerResult({
      markdown: "# Demo\n\n::: block{id=\"main\"}\nBody\n:::",
      actions: {
        app_id: "demo",
        state_id: "demo:1",
        state_version: 1,
        blocks: ["main"],
        actions: []
      },
      route: "/demo",
      regions: {
        main: "Body"
      }
    });

    expect(result.route).toBe("/demo");
    expect(result.page?.frontmatter.route).toBe("/demo");
    expect(result.page?.blockContent.main).toBe("Body");
    expect(result.page?.executableContent).toContain('"state_id": "demo:1"');
  });

  it("normalizes readable surfaces into page handler results", () => {
    const result = normalizePageHandlerResult({
      markdown: "# Demo",
      actions: {
        app_id: "demo",
        state_id: "demo:page:1",
        state_version: 1,
        blocks: [],
        actions: []
      },
      route: "/page"
    });

    expect(result.surface?.route).toBe("/page");
    expect(result.route).toBe("/page");
    expect(result.page?.frontmatter.route).toBe("/page");
    expect(result.page?.markdown).toContain("# Demo");
  });

  it("fills missing readable-surface state metadata before projection", () => {
    const result = normalizeActionHandlerResult({
      markdown: "# Demo\n\n::: block{id=\"main\"}\nBody\n:::",
      actions: {
        app_id: "demo",
        blocks: ["main"],
        actions: []
      },
      route: "/demo",
      regions: {
        main: "Body"
      }
    });

    expect(result.page?.executableContent).toContain('"app_id": "demo"');
    expect(result.page?.executableContent).toContain('"state_id": "demo:demo"');
    expect(result.page?.executableContent).toMatch(/"state_version": \d+/);
  });

  it("maps normalized page results into action results without dropping metadata", () => {
    const normalized = normalizePageHandlerResult({
      page: {
        frontmatter: {},
        markdown: "# Demo",
        blocks: []
      },
      route: "/page",
      status: 202,
      headers: {
        "x-demo": "ok"
      },
      session: {
        type: "refresh",
        session: {
          user: "alice"
        }
      }
    });

    expect(pageResultToActionResult(normalized, "/fallback")).toEqual({
      page: normalized.page,
      route: "/page",
      status: 202,
      headers: {
        "x-demo": "ok"
      },
      session: {
        type: "refresh",
        session: {
          user: "alice"
        }
      }
    });
  });

  it("marks unsupported page handler payloads as invalid instead of projecting them", () => {
    const result = normalizePageHandlerResult({
      route: "/broken",
      foo: "bar"
    } as never);

    expect(result.invalid).toBe(true);
    expect(result.page).toBeNull();
    expect(result.surface).toBeUndefined();
  });

  it("marks unsupported action handler payloads as invalid instead of projecting them", () => {
    const result = normalizeActionHandlerResultLike({
      route: "/broken",
      foo: "bar"
    } as never);

    expect(result.invalid).toBe(true);
    expect(result.action).toBeUndefined();
    expect(result.surface).toBeUndefined();
    expect(result.stream).toBeUndefined();
  });
});
