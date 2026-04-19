import { describe, expect, it } from "vitest";

import { handlePlannedHostRequest } from "../../src/server/host-flow-shared.js";

describe("handlePlannedHostRequest", () => {
  it("returns redirect responses through the adapter callback", async () => {
    await expect(
      handlePlannedHostRequest(
        { kind: "redirect", location: "/docs" },
        {
          onRedirect: async (location) => ({ kind: "redirect", location }),
          onFavicon: async () => ({ kind: "favicon" }),
          onMissingLocalBrowserModule: async (filePath) => ({ kind: "missing", filePath }),
          onBrowserShell: async () => ({ kind: "browser-shell" }),
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
          onMissingLocalBrowserModule: async (filePath) => ({ kind: "missing", filePath }),
          onBrowserShell: async () => ({ kind: "browser-shell" }),
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
          onMissingLocalBrowserModule: async (filePath) => ({ kind: "missing", filePath }),
          onBrowserShell: async () => ({ kind: "browser-shell" }),
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
