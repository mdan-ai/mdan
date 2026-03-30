import { marked } from "marked";
import { describe, expect, it } from "vitest";

import { createDocsSiteServer } from "../../../docs-site/src/index.js";

describe("docs-site root app", () => {
  it("renders docs shell with sidebar navigation, search input, and right toc", async () => {
    const server = createDocsSiteServer({
      pages: {
        "/docs": `---
title: Docs
---

# Docs

Welcome.
`,
        "/docs/sdk": `---
title: SDK Overview
---

# SDK Overview

Intro paragraph.

## Setup

Install dependencies.

### Verify

Run tests.
`
      }
    });

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/docs/sdk",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/html");
    expect(response.body).toContain('id="docs-nav-filter"');
    expect(response.body).toContain('href="/docs"');
    expect(response.body).toContain('aria-current="page"');
    expect(response.body).toContain("On this page");
    expect(response.body).toContain('href="#setup"');
    expect(response.body).toContain('href="#verify"');
    expect(response.body).toContain('src="/docs-site/docs.js"');
  });

  it("supports custom third-party markdown renderer and keeps toc output", async () => {
    const markdownRenderer = {
      render(markdown: string) {
        return marked.parse(markdown) as string;
      }
    };

    const server = createDocsSiteServer({
      markdownRenderer,
      pages: {
        "/docs": `# Home`,
        "/docs/elements": `# Elements

## API

This is **important**.
`
      }
    });

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/docs/elements",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("<strong>important</strong>");
    expect(response.body).toContain('href="#api"');
    expect(response.body).toContain('<h2 id="api">');
  });
});
