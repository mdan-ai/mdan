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
