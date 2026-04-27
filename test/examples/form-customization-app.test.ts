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

  it("keeps block results in readable markdown instead of executable JSON regions", async () => {
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
    expect(body).toContain("## Forecast");
    expect(body).not.toContain('"regions": {');
    expect(body).not.toContain('"main": "## Forecast');
  });
});
