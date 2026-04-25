import { describe, expect, it } from "vitest";

import { createFormCustomizationServer } from "../../examples/form-customization/app.js";

describe("form customization app example", () => {
  it("serves the page route and query updates through one GET page handler", async () => {
    const app = createFormCustomizationServer();
    const host = app.host("bun");

    const response = await host(new Request("https://example.test/?location=Shanghai&units=imperial", {
      headers: {
        accept: "text/markdown"
      }
    }));

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Shanghai");
    expect(body).toContain("72F");
  });

  it("keeps block anchors in raw markdown instead of inlining the block region twice", async () => {
    const app = createFormCustomizationServer();
    const host = app.host("bun");

    const response = await host(new Request("https://example.test/index.md", {
      headers: {
        accept: "text/markdown"
      }
    }));

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('<!-- mdan:block id="main" -->');
    expect(body).toContain('"regions": {');
    expect(body).toContain('"main": "## Forecast');
    expect(body).not.toContain("# Weather Lookup\n\nUse the custom weather query panel below to update the forecast view.\n\n## Forecast");
  });
});
