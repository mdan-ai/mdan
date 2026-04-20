import { describe, expect, it } from "vitest";

import { normalizeActionHandlerResult, normalizePageHandlerResult } from "../../src/server/result-normalization.js";

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

    expect(result.route).toBe("/page");
    expect(result.page?.frontmatter.route).toBe("/page");
    expect(result.page?.markdown).toContain("# Demo");
  });
});
