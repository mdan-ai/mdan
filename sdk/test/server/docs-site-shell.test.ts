import { describe, expect, it } from "vitest";

import { createDocsSiteServer } from "../../../docs-site/src/index.js";

describe("docs-site shell", () => {
  it("renders docs routes with the current docs-site shell, locale switcher, navigation, and toc", async () => {
    const server = createDocsSiteServer({
      pages: {
        "/docs": `---
title: Docs Home
---

# Docs Home

Welcome to docs.
`,
        "/zh/docs": `---
title: 文档首页
---

# 文档首页

欢迎来到文档。
`,
        "/docs/getting-started": `---
title: Getting Started
---

# Getting Started

Install and run.

## Setup

Install dependencies.

### Verify

Run tests.

This is **important**.
`,
        "/docs/examples": `---
title: Examples
---

# Examples

## Starter Paths

### [\`examples/starter\`](https://github.com/mdan-ai/mdan/tree/main/examples/starter)

The smallest path first.
`
      }
    });

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/getting-started",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/html");
    expect(response.body).toContain("MDAN Docs");
    expect(response.body).toContain("Getting Started");
    expect(response.body).toContain('aria-current="page"');
    expect(response.body).toContain('id="docs-nav-filter"');
    expect(response.body).toContain('placeholder="Search docs..."');
    expect(response.body).toContain('<script defer src="/docs-site/docs.js"></script>');
    expect(response.body).toContain("Install and run.");
    expect(response.body).toContain('<aside class="docs-toc">');
    expect(response.body).toContain('href="#setup"');
    expect(response.body).toContain('href="#verify"');
    expect(response.body).toContain("<strong>important</strong>");
    expect(response.body).toContain('>EN</a>');
    expect(response.body).toContain('>中文</a>');
    expect(response.body).toContain('href="/getting-started"');
    expect(response.body).not.toContain('href="/docs/getting-started"');
    expect(response.body).toContain('<link rel="alternate" type="text/markdown" href="/getting-started">');
    expect(response.body).toContain('<link rel="llms-txt" href="/llms.txt">');
  });

  it("renders links and code spans correctly inside docs headings and toc entries", async () => {
    const server = createDocsSiteServer({
      pages: {
        "/": `# Docs Home`,
        "/examples": `---
title: Examples
---

# Examples

## Starter Paths

### [\`examples/starter\`](https://github.com/mdan-ai/mdan/tree/main/examples/starter)

The smallest path first.
`
      }
    });

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/examples",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain('href="https://github.com/mdan-ai/mdan/tree/main/examples/starter"');
    expect(response.body).toContain("<code>examples/starter</code>");
    expect(response.body).not.toContain("[`examples/starter`]");
    expect(response.body).toContain('href="#examplesstarter"');
  });

  it("falls back across locales for missing translated pages while keeping zh shell labels", async () => {
    const server = createDocsSiteServer({
      pages: {
        "/docs": `# Docs Home`,
        "/zh/docs": `# 文档首页`,
        "/docs/custom-rendering": `---
title: Custom Rendering
---

# Custom Rendering

Bring your own renderer.

## Shell

Keep docs and shell aligned.
`
      }
    });

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/zh/custom-rendering",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain('<html lang="zh">');
    expect(response.body).toContain("Bring your own renderer.");
    expect(response.body).toContain("本页目录");
    expect(response.body).toContain("搜索");
    expect(response.body).toContain("/zh");
  });

  it("keeps old /docs links working as compatibility aliases", async () => {
    const server = createDocsSiteServer({
      pages: {
        "/": `# Docs Home`,
        "/getting-started": `# Getting Started`
      }
    });

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/docs/getting-started",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("Getting Started");
    expect(response.body).toContain('href="/getting-started"');
  });

  it("renders canonical, description, and social metadata for docs pages", async () => {
    const server = createDocsSiteServer({
      siteTitle: "MDAN Docs",
      pages: {
        "/": `# Docs Home`,
        "/what-is-mdan": `---
title: What is MDAN?
description: Understand what MDAN is, who it is for, and when to use it.
---

# What is MDAN?

MDAN is a Markdown-first framework.
`
      }
    });

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/what-is-mdan",
      headers: { accept: "text/html" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain(
      '<meta name="description" content="Understand what MDAN is, who it is for, and when to use it.">'
    );
    expect(response.body).toContain('<link rel="canonical" href="https://docs.mdan.ai/what-is-mdan">');
    expect(response.body).toContain('<meta property="og:title" content="What is MDAN? · MDAN Docs">');
    expect(response.body).toContain(
      '<meta property="og:description" content="Understand what MDAN is, who it is for, and when to use it.">'
    );
    expect(response.body).toContain('<meta property="og:url" content="https://docs.mdan.ai/what-is-mdan">');
    expect(response.body).toContain('<meta name="twitter:card" content="summary">');
    expect(response.body).toContain('<link rel="alternate" hreflang="en" href="https://docs.mdan.ai/what-is-mdan">');
    expect(response.body).toContain(
      '<link rel="alternate" hreflang="zh" href="https://docs.mdan.ai/zh/what-is-mdan">'
    );
  });
});
