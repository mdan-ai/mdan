import { describe, expect, it } from "vitest";

import { normalizePageDefinition } from "../../src/app-internal/normalize-page.js";

describe("normalizePageDefinition", () => {
  it("normalizes a page with blocks and page-owned actions", () => {
    const page = normalizePageDefinition({
      path: "/",
      definition: {
        markdownPath: "./app/index.md",
        markdownSource: "# Starter App\n\n::: block{id=\"main\"}\n:::",
        blocks: {
          main({ state }) {
            return Array.isArray((state as { messages?: unknown[] }).messages) ? "rendered" : "empty";
          }
        },
        actions: {
          refresh_main: {
            method: "GET"
          },
          submit_message: {
            method: "POST",
            input: {
              message: {
                kind: "text",
                required: true
              }
            },
            run() {
              return { pagePath: "/" };
            }
          }
        }
      }
    });

    expect(page.id).toBe("root");
    expect(page.path).toBe("/");
    expect(page.markdownPath).toBe("./app/index.md");
    expect(page.blocks.map((block) => block.name)).toEqual(["main"]);
    expect(page.actions.map((action) => action.id)).toEqual(["refresh_main", "submit_message"]);
    expect(page.actions[0]).toMatchObject({
      pageId: "root",
      pagePath: "/",
      path: "/__actions/refresh_main"
    });
  });
});
