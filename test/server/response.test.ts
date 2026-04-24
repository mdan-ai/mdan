import { describe, expect, it } from "vitest";

import { createHtmlSurfaceResponse } from "../../src/server/response.js";

describe("server response helpers", () => {
  it("renders readable surfaces as snapshot html without legacy json bootstrap", () => {
    const response = createHtmlSurfaceResponse({
      markdown: "# Demo\n\n<!-- mdan:block id=\"main\" -->\nBody",
      actions: {
        app_id: "demo",
        state_id: "demo:1",
        state_version: 1,
        blocks: {
          main: { actions: [] }
        },
        actions: {}
      },
      route: "/demo",
      regions: {
        main: "Body"
      }
    }, { title: "Demo" });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/html");
    expect(String(response.body)).toContain("<h1>Demo</h1>");
    expect(String(response.body)).toContain("Body");
    expect(String(response.body)).not.toContain('id="mdan-initial-surface"');
    expect(String(response.body)).not.toContain("createHeadlessHost");
  });
});
