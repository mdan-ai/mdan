import { describe, expect, it } from "vitest";

import { createFrontend, defineFrontendModule } from "../../src/frontend/index.js";
import { handlePlannedHostRequest } from "../../src/server/host/flow.js";
import { normalizeHostFrontendOption, renderBuiltinFrontendEntryHtml } from "../../src/server/host/frontend.js";
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
      planHostRequest("/__mdan/entry.js", "GET", "text/javascript", {
        frontend: true
      })
    ).toEqual({
      kind: "static-candidates",
      filePaths: [expect.stringContaining("dist-browser/entry.js")]
    });
  });

  it("maps a module-defined frontend object to the built-in app frontend route", () => {
    const frontend = defineFrontendModule(
      "file:///tmp/weather-frontend.js",
      createFrontend({})
    );

    expect(
      normalizeHostFrontendOption(frontend)
    ).toMatchObject({
      module: "/tmp/weather-frontend.js",
      exportName: "default"
    });

    expect(
      planHostRequest("/__mdan/app-frontend.js", "GET", "text/javascript", {
        frontend
      })
    ).toEqual({
      kind: "static-candidates",
      filePaths: ["/tmp/weather-frontend.js"]
    });
  });

  it("uses the declared frontend export name when booting a direct frontend object", () => {
    const frontend = defineFrontendModule(
      "file:///tmp/weather-frontend.js",
      createFrontend({}),
      "weatherFrontend"
    );

    const html = renderBuiltinFrontendEntryHtml(frontend);

    expect(html).toContain('import * as frontendModule from "/__mdan/app-frontend.js"');
    expect(html).toContain('frontendModule["weatherFrontend"]');
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
