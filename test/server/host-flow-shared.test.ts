import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createFrontend, defineFrontendModule } from "../../src/frontend/index.js";
import { handlePlannedHostRequest } from "../../src/server/host/flow.js";
import {
  getBuiltinFrontendStaticFile,
  normalizeHostFrontendOption,
  renderBuiltinFrontendEntryHtml
} from "../../src/server/host/frontend.js";
import { planHostRequest } from "../../src/server/host/shared.js";

describe("handlePlannedHostRequest", () => {
  it("plans frontend entry delivery for html document routes while leaving markdown suffix routes on runtime", () => {
    expect(
      planHostRequest("/login", "GET", "text/html,application/xhtml+xml", {
        frontendEntry: "/tmp/index.html"
      })
    ).toEqual({
      kind: "static-candidates",
      filePaths: ["/tmp/index.html"]
    });

    expect(
      planHostRequest("/login.md", "GET", "text/html,application/xhtml+xml", {
        frontendEntry: "/tmp/index.html"
      })
    ).toEqual({
      kind: "runtime",
      pathnameOverride: "/login"
    });

    expect(
      planHostRequest("/index.md", "GET", "text/markdown", {
        frontendEntry: "/tmp/index.html"
      })
    ).toEqual({
      kind: "runtime",
      pathnameOverride: "/"
    });
  });

  it("plans built-in frontend entry and bundled asset delivery when frontend mode is enabled", () => {
    expect(
      planHostRequest("/login", "GET", "text/html,application/xhtml+xml", {
        frontend: true
      })
    ).toEqual({
      kind: "frontend-entry"
    });

    expect(
      planHostRequest("/login", "GET", null, {
        frontend: true
      })
    ).toEqual({
      kind: "frontend-entry"
    });

    expect(
      planHostRequest("/login", "GET", "*/*", {
        frontend: true
      })
    ).toEqual({
      kind: "frontend-entry"
    });

    expect(
      planHostRequest("/__mdan/entry.js", "GET", "text/javascript", {
        frontend: true
      })
    ).toEqual({
      kind: "static-candidates",
      filePaths: [expect.stringContaining("dist-browser/entry.js")]
    });
  });

  it("maps a module-defined frontend object to the built-in frontend module route", () => {
    const moduleUrl = `file://${resolve("examples/form-customization/frontend.js")}`;
    const frontend = defineFrontendModule(
      moduleUrl,
      createFrontend({})
    );

    expect(
      normalizeHostFrontendOption(frontend)
    ).toMatchObject({
      module: resolve("examples/form-customization/frontend.js"),
      exportName: "default"
    });

    expect(
      planHostRequest("/__mdan/module.js", "GET", "text/javascript", {
        frontend
      })
    ).toEqual({
      kind: "static-candidates",
      filePaths: [expect.stringContaining(".bundle.js")]
    });
  });

  it("bundles app frontend modules into a browser-loadable /__mdan/module.js asset", async () => {
    const frontend = defineFrontendModule(
      `file://${resolve("examples/form-customization/frontend.js")}`,
      createFrontend({})
    );

    const filePath = getBuiltinFrontendStaticFile("/__mdan/module.js", frontend);

    expect(filePath).toBeTruthy();
    expect(filePath).toContain(".bundle.js");

    const contents = await readFile(filePath!, "utf8");
    expect(contents).not.toContain('from "@mdanai/sdk/frontend"');
  });

  it("uses the declared frontend export name when booting a direct frontend object", () => {
    const frontend = defineFrontendModule(
      "file:///tmp/weather-frontend.js",
      createFrontend({}),
      "weatherFrontend"
    );

    const html = renderBuiltinFrontendEntryHtml(frontend);

    expect(html).toContain('import * as frontendModule from "/__mdan/module.js"');
    expect(html).toContain('frontendModule["weatherFrontend"]');
  });

  it("keeps client projection as an empty browser root while passing initial markdown to the frontend", () => {
    const html = renderBuiltinFrontendEntryHtml(true, {
      initialMarkdown: "# Client First"
    });

    expect(html).toContain('<div data-mdan-ui-root></div>');
    expect(html).not.toContain("<h1>Client First</h1>");
    expect(html).toContain('initialMarkdown: "# Client First"');
  });

  it("renders readable markdown into the browser root for html projection", () => {
    const initialMarkdown = `---
title: Searchable Demo
description: This should become metadata.
---

# Searchable Demo

This content should be visible before the frontend boots.

<!-- mdan:block id="main" -->

\`\`\`mdan
{
  "blocks": {
    "main": {
      "actions": ["submit"]
    }
  },
  "regions": {
    "main": "## Server Region\\n\\nRegion markdown is server-rendered."
  },
  "actions": {
    "submit": {
      "target": "/submit"
    }
  }
}
\`\`\`
`;

    const html = renderBuiltinFrontendEntryHtml(true, {
      initialMarkdown,
      projection: "html"
    });

    expect(html).toContain("<title>Searchable Demo</title>");
    expect(html).toContain('<meta name="description" content="This should become metadata.">');
    expect(html).toContain("<h1>Searchable Demo</h1>");
    expect(html).toContain("<p>This content should be visible before the frontend boots.</p>");
    expect(html).toContain('<section data-mdan-block="main">');
    expect(html).toContain("<h2>Server Region</h2>");
    expect(html).toContain('<div data-mdan-action-root data-mdan-block="main"></div>');
    expect(html).not.toContain("&lt;!-- mdan:block");
    expect(html).not.toContain('"target": "/submit"');
    expect(html).not.toContain("<form");
    expect(html).toContain("createFrontend().autoBoot");
    expect(html).toContain("initialMarkdown:");
    expect(html).toContain('browserProjection: "html"');
  });

  it("escapes initial markdown safely inside the inline boot script", () => {
    const html = renderBuiltinFrontendEntryHtml(true, {
      initialMarkdown: '# Demo\n\n</script><img src=x onerror="alert(1)">',
      projection: "html"
    });
    const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1] ?? "";

    expect(script).not.toContain("</script>");
    expect(script).toContain("\\u003c/script\\u003e");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("returns redirect responses through the adapter callback", async () => {
    await expect(
      handlePlannedHostRequest(
        { kind: "redirect", location: "/docs" },
        {
          onRedirect: async (location) => ({ kind: "redirect", location }),
          onFavicon: async () => ({ kind: "favicon" }),
          onFrontendEntry: async () => ({ kind: "frontend-entry" }),
          onRuntime: async () => ({ kind: "runtime" }),
          serveStaticFile: async () => null
        }
      )
    ).resolves.toEqual({ kind: "redirect", location: "/docs" });
  });

  it("falls through static candidates to runtime when none can be served", async () => {
    const seen: string[] = [];

    await expect(
      handlePlannedHostRequest(
        { kind: "static-candidates", filePaths: ["/a.js", "/b.js"] },
        {
          onRedirect: async (location) => ({ kind: "redirect", location }),
          onFavicon: async () => ({ kind: "favicon" }),
          onFrontendEntry: async () => ({ kind: "frontend-entry" }),
          onRuntime: async () => ({ kind: "runtime" }),
          serveStaticFile: async (filePath) => {
            seen.push(filePath);
            return null;
          }
        }
      )
    ).resolves.toEqual({ kind: "runtime" });

    expect(seen).toEqual(["/a.js", "/b.js"]);
  });

  it("returns the first served static candidate without entering runtime", async () => {
    const seen: string[] = [];

    await expect(
      handlePlannedHostRequest(
        { kind: "static-candidates", filePaths: ["/a.js", "/b.js"] },
        {
          onRedirect: async (location) => ({ kind: "redirect", location }),
          onFavicon: async () => ({ kind: "favicon" }),
          onFrontendEntry: async () => ({ kind: "frontend-entry" }),
          onRuntime: async () => ({ kind: "runtime" }),
          serveStaticFile: async (filePath) => {
            seen.push(filePath);
            return filePath === "/b.js" ? { kind: "static", filePath } : null;
          }
        }
      )
    ).resolves.toEqual({ kind: "static", filePath: "/b.js" });

    expect(seen).toEqual(["/a.js", "/b.js"]);
  });
});
