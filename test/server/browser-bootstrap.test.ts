import { describe, expect, it, vi } from "vitest";

import type { MdanPage } from "../../src/protocol/types.js";
import { createMdanServer } from "../../src/server/index.js";
import { MDAN_BROWSER_BOOTSTRAP_INTENT_HEADER } from "../../src/server/types/transport.js";

function page(name: string, autoTarget?: string): MdanPage {
  return {
    frontmatter: {},
    markdown: `# ${name}`,
    blocks: [
      {
        name: "main",
        inputs: [],
        operations: autoTarget
          ? [
              {
                method: "GET",
                target: autoTarget,
                name: `load-${name}`,
                inputs: [],
                auto: true
              }
            ]
          : []
      }
    ]
  };
}

describe("browser bootstrap runtime", () => {
  it("invokes bootstrap only for entry bootstrap requests and bypasses agent markdown reads", async () => {
    const bootstrap = vi.fn(async () => ({
      page: page("booted")
    }));
    const server = createMdanServer({
      actionProof: { disabled: true },
      browserBootstrap: bootstrap
    });

    server.page("/root", async () => page("root"));

    const normalResponse = await server.handle({
      method: "GET",
      url: "https://example.test/root",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(normalResponse.status).toBe(200);
    expect(String(normalResponse.body)).toContain("# root");
    expect(bootstrap).not.toHaveBeenCalled();

    const bootstrapResponse = await server.handle({
      method: "GET",
      url: "https://example.test/root",
      headers: {
        accept: "text/markdown",
        [MDAN_BROWSER_BOOTSTRAP_INTENT_HEADER]: "entry"
      },
      cookies: {}
    });

    expect(bootstrapResponse.status).toBe(200);
    expect(String(bootstrapResponse.body)).toContain("# booted");
    expect(bootstrap).toHaveBeenCalledTimes(1);
  });

  it("can return a fragment result from browser bootstrap", async () => {
    const server = createMdanServer({
      actionProof: { disabled: true },
      browserBootstrap: async () => ({
        fragment: {
          markdown: "## Boot fragment",
          blocks: []
        }
      })
    });

    server.page("/root", async () => page("root"));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/root",
      headers: {
        accept: "text/markdown",
        [MDAN_BROWSER_BOOTSTRAP_INTENT_HEADER]: "entry"
      },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(String(response.body)).toContain("## Boot fragment");
    expect(String(response.body)).not.toContain("# root");
  });

  it("strips the bootstrap marker before resolving auto dependencies from a bootstrap result", async () => {
    const resolveRequest = vi.fn(({ sourceRequest, action }: { sourceRequest: { url: string; headers: Record<string, string | undefined> }; action: { target: string } }) => {
      expect(sourceRequest.headers[MDAN_BROWSER_BOOTSTRAP_INTENT_HEADER]).toBeUndefined();
      return {
        ...sourceRequest,
        method: "GET" as const,
        url: new URL(action.target, sourceRequest.url).toString()
      };
    });

    const server = createMdanServer({
      actionProof: { disabled: true },
      auto: {
        resolveRequest
      },
      browserBootstrap: async () => ({
        page: page("boot", "/step-1")
      })
    });

    server.page("/root", async () => page("root"));
    server.page("/step-1", async () => page("step-1"));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/root",
      headers: {
        accept: "text/markdown",
        [MDAN_BROWSER_BOOTSTRAP_INTENT_HEADER]: "entry"
      },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(String(response.body)).toContain("# step-1");
    expect(resolveRequest).toHaveBeenCalledTimes(1);
  });
});
