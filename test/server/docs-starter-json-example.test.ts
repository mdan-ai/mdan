import { describe, expect, it } from "vitest";

import { createDocsStarterServer } from "../../examples/docs-starter/app.js";

describe("docs-starter json example", () => {
  it("renders docs starter page", async () => {
    const server = createDocsStarterServer();

    const home = await server.handle({
      method: "GET",
      url: "https://example.test/",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(home.status).toBe(200);
    expect(String(home.body)).toContain("# Docs Starter");
    expect(String(home.body)).toContain("# Getting Started");
  });
});
