import { describe, expect, it } from "vitest";

import { handlePlannedHostRequest } from "../../src/server/host/flow.js";
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

  it("returns redirect responses through the adapter callback", async () => {
    await expect(
      handlePlannedHostRequest(
        { kind: "redirect", location: "/docs" },
        {
          onRedirect: async (location) => ({ kind: "redirect", location }),
          onFavicon: async () => ({ kind: "favicon" }),
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
