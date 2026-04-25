import { describe, expect, it, vi } from "vitest";

import type { MdanPage } from "../../src/protocol/types.js";
import { normalizeActionHandlerResult } from "../../src/server/result-normalization.js";
import { createMdanServer } from "../../src/server/index.js";
import { resolveAutoActionResult, resolveAutoDependencies } from "../../src/server/auto-dependencies.js";
import { MdanRouter } from "../../src/server/router.js";

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

function envelope(name: string, autoTarget?: string) {
  return {
    markdown: `# ${name}`,
    actions: {
      app_id: "auto-test",
      state_id: `auto-test:${name}`,
      state_version: 1,
      blocks: {
        main: { actions: autoTarget ? [`load-${name}`] : [] }
      },
      actions: autoTarget
        ? {
            [`load-${name}`]: {
              target: autoTarget,
              transport: { method: "GET" },
              verb: "read",
              auto: true
            }
          }
        : {}
    },
    route: `/${name}`,
    regions: {
      main: name
    }
  };
}

describe("resolveAutoDependencies", () => {
  it("limits auto dependency fan-out with maxPasses", async () => {
    const router = new MdanRouter();
    const calls: string[] = [];

    router.page("/step-1", async () => {
      calls.push("step-1");
      return envelope("step-1", "/step-2");
    });
    router.page("/step-2", async () => {
      calls.push("step-2");
      return envelope("step-2");
    });

    const request = {
      method: "GET" as const,
      url: "https://example.test/root",
      headers: {},
      cookies: {}
    };

    const disabled = await resolveAutoDependencies(page("root", "/step-1"), request, null, router, {}, { maxPasses: 0 });
    expect(calls).toEqual([]);
    expect(disabled.route).toBeUndefined();

    calls.length = 0;
    const defaulted = await resolveAutoDependencies(page("root", "/step-1"), request, null, router, {}, { maxPasses: 1 });
    expect(calls).toEqual(["step-1"]);
    expect(defaulted.route).toBe("/step-1");
  });

  it("honors createMdanServer auto dependency pass budgets", async () => {
    const calls: string[] = [];
    const server = createMdanServer({
      actionProof: { disabled: true },
      autoDependencies: {
        maxPasses: 0
      }
    });

    server.page("/root", async () => envelope("root", "/step-1"));
    server.page("/step-1", async () => {
      calls.push("step-1");
      return envelope("step-1");
    });

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/root",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(String(response.body)).toContain("# root");
    expect(calls).toEqual([]);
  });

  it("accepts the older autoDependencies option name", async () => {
    const calls: string[] = [];
    const server = createMdanServer({
      actionProof: { disabled: true },
      autoDependencies: {
        maxPasses: 0
      }
    });

    server.page("/root", async () => envelope("root", "/step-1"));
    server.page("/step-1", async () => {
      calls.push("step-1");
      return envelope("step-1");
    });

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/root",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(String(response.body)).toContain("# root");
    expect(calls).toEqual([]);
  });

  it("merges auto and autoDependencies when both are provided", async () => {
    const calls: string[] = [];
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const server = createMdanServer({
        actionProof: { disabled: true },
        auto: {
          resolveRequest({ sourceRequest, action }) {
            const sourceUrl = new URL(sourceRequest.url);
            const targetUrl = new URL(action.target, sourceRequest.url);
            const location = sourceUrl.searchParams.get("location");
            if (location) {
              targetUrl.searchParams.set("location", location);
            }
            return {
              ...sourceRequest,
              method: "GET",
              url: targetUrl.toString()
            };
          }
        },
        autoDependencies: { maxPasses: 0 }
      });

      server.page("/root", async () => envelope("root", "/step-1"));
      server.get("/step-1", async ({ inputs }) => {
        calls.push(String(inputs.location ?? "missing"));
        return envelope(String(inputs.location ?? "missing"));
      });

      const response = await server.handle({
        method: "GET",
        url: "https://example.test/root?location=hangzhou",
        headers: {
          accept: "text/markdown"
        },
        cookies: {}
      });

      expect(response.status).toBe(200);
      expect(String(response.body)).toContain("# root");
      expect(calls).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        "[mdan-sdk] createMdanServer received both options.auto and options.autoDependencies; merging them with options.auto taking precedence for overlapping fields."
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("does not let undefined auto fields override autoDependencies", async () => {
    const calls: string[] = [];
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const server = createMdanServer({
        actionProof: { disabled: true },
        auto: {
          maxPasses: undefined,
          resolveRequest({ sourceRequest, action }) {
            const sourceUrl = new URL(sourceRequest.url);
            const targetUrl = new URL(action.target, sourceRequest.url);
            const location = sourceUrl.searchParams.get("location");
            if (location) {
              targetUrl.searchParams.set("location", location);
            }
            return {
              ...sourceRequest,
              method: "GET",
              url: targetUrl.toString()
            };
          }
        },
        autoDependencies: { maxPasses: 0 }
      });

      server.page("/root", async () => page("root", "/step-1"));
      server.get("/step-1", async ({ inputs }) => {
        calls.push(String(inputs.location ?? "missing"));
        return envelope(String(inputs.location ?? "missing"));
      });

      const response = await server.handle({
        method: "GET",
        url: "https://example.test/root?location=hangzhou",
        headers: {
          accept: "text/markdown"
        },
        cookies: {}
      });

      expect(response.status).toBe(200);
      expect(String(response.body)).toContain("# root");
      expect(calls).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        "[mdan-sdk] createMdanServer received both options.auto and options.autoDependencies; merging them with options.auto taking precedence for overlapping fields."
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("lets apps resolve dynamic auto requests before runtime dispatch", async () => {
    const router = new MdanRouter();

    router.get("/step-1", async ({ inputs }) => envelope(String(inputs.location ?? "missing")));

    const request = {
      method: "GET" as const,
      url: "https://example.test/root?location=hangzhou",
      headers: {},
      cookies: {}
    };

    const resolved = await resolveAutoDependencies(page("root", "/step-1"), request, null, router, {}, {
      resolveRequest({ action, sourceRequest }) {
        const sourceUrl = new URL(sourceRequest.url);
        const targetUrl = new URL(action.target, sourceRequest.url);
        const location = sourceUrl.searchParams.get("location");
        if (location) {
          targetUrl.searchParams.set("location", location);
        }
        return {
          ...sourceRequest,
          method: "GET",
          url: targetUrl.toString()
        };
      }
    });

    expect(resolved.page?.markdown).toContain("# hangzhou");
  });

  it("can skip static auto fallback when resolver returns null", async () => {
    const router = new MdanRouter();
    const calls: string[] = [];

    router.page("/step-1", async () => {
      calls.push("step-1");
      return envelope("step-1");
    });

    const request = {
      method: "GET" as const,
      url: "https://example.test/root",
      headers: {},
      cookies: {}
    };

    const resolved = await resolveAutoDependencies(page("root", "/step-1"), request, null, router, {}, {
      fallbackToStaticTarget: false,
      resolveRequest() {
        return null;
      }
    });

    expect(calls).toEqual([]);
    expect(resolved.page?.markdown).toContain("# root");
  });

  it("rejects cross-origin dynamic auto requests", async () => {
    const router = new MdanRouter();
    const request = {
      method: "GET" as const,
      url: "https://example.test/root",
      headers: {},
      cookies: {}
    };

    await expect(
      resolveAutoDependencies(page("root", "/step-1"), request, null, router, {}, {
        resolveRequest({ sourceRequest }) {
          return {
            ...sourceRequest,
            method: "GET",
            url: "https://evil.example/step-1"
          };
        }
      })
    ).rejects.toThrow(/same-origin/i);
  });

  it("rejects invalid dynamic auto request shapes with actionable errors", async () => {
    const router = new MdanRouter();
    const request = {
      method: "GET" as const,
      url: "https://example.test/root",
      headers: {},
      cookies: {}
    };

    await expect(
      resolveAutoDependencies(page("root", "/step-1"), request, null, router, {}, {
        resolveRequest() {
          return {
            method: "GET",
            url: "",
            headers: {}
          } as unknown as typeof request;
        }
      })
    ).rejects.toThrow(/request\.url/i);
  });

  it("rejects html page reads before auto dependency projection", async () => {
    const server = createMdanServer({
      actionProof: { disabled: true }
    });

    server.page("/root", async () => page("root", "/step-1"));
    server.page("/step-1", async () => page("step-1"));

    const response = await server.handle({
      method: "GET",
      url: "https://example.test/root",
      headers: {
        accept: "text/html"
      },
      cookies: {}
    });

    expect(response.status).toBe(406);
    expect(String(response.body)).toContain("## Not Acceptable");
  });

  it("preserves session mutations from page-based auto dependency results", async () => {
    const router = new MdanRouter();

    router.page("/step-1", async () => ({
      page: page("step-1"),
      route: "/step-1",
      status: 202,
      headers: {
        "x-step": "1"
      },
      session: {
        type: "refresh" as const,
        session: {
          user: "alice"
        }
      }
    }));

    const request = {
      method: "GET" as const,
      url: "https://example.test/root",
      headers: {},
      cookies: {}
    };

    const resolved = await resolveAutoDependencies(page("root", "/step-1"), request, null, router, {});

    expect(resolved.route).toBe("/step-1");
    expect(resolved.status).toBe(202);
    expect(resolved.headers).toEqual({
      "x-step": "1"
    });
    expect(resolved.session).toEqual({
      type: "refresh",
      session: {
        user: "alice"
      }
    });
    expect(resolved.page.markdown).toContain("# step-1");
  });

  it("rejects invalid readable-surface GET action results during auto dependency resolution", async () => {
    const router = new MdanRouter();

    router.get("/step-1", async () => ({
      markdown: `# Broken

Broken

<!-- mdan:block id="main" -->`,
      actions: {
        app_id: "auto-test",
        state_id: "auto-test:broken",
        state_version: 1,
        blocks: {
          main: { actions: ["missing_action"] }
        },
        actions: {
          open: {
            verb: "route",
            target: "/open"
          }
        }
      },
      route: "/step-1",
      regions: {
        main: "Broken"
      }
    }));

    const request = {
      method: "GET" as const,
      url: "https://example.test/root",
      headers: {},
      cookies: {}
    };

    await expect(resolveAutoDependencies(page("root", "/step-1"), request, null, router, {})).rejects.toThrow(
      /invalid actions contract/i
    );
  });

  it("accepts readable-surface GET auto results without explicit state metadata", async () => {
    const router = new MdanRouter();

    router.get("/step-1", async () => ({
      markdown: `# Step 1

Done

<!-- mdan:block id="main" -->`,
      actions: {
        app_id: "auto-test",
        blocks: {
          main: { actions: [] }
        },
        actions: {}
      },
      route: "/step-1",
      regions: {
        main: "Done"
      }
    }));

    const request = {
      method: "GET" as const,
      url: "https://example.test/root",
      headers: {},
      cookies: {}
    };

    const resolved = await resolveAutoDependencies(page("root", "/step-1"), request, null, router, {});

    expect(resolved.route).toBe("/step-1");
    expect(resolved.page.executableContent).toContain('"state_id": "auto-test:step-1"');
    expect(resolved.page.executableContent).toMatch(/"state_version": \d+/);
  });

  it("exposes invalid readable-surface GET action results through normalized action results today", async () => {
    const broken = normalizeActionHandlerResult({
      markdown: `# Broken

Broken

<!-- mdan:block id="main" -->`,
      actions: {
        app_id: "auto-test",
        state_id: "auto-test:broken",
        state_version: 1,
        blocks: {
          main: { actions: ["missing_action"] }
        },
        actions: {
          open: {
            verb: "route",
            target: "/open"
          }
        }
      },
      route: "/step-1",
      regions: {
        main: "Broken"
      }
    });

    expect(broken.page?.markdown).toContain("# Broken");
  });

  it("prefers resolved page metadata over the current action result when auto-resolving page results", async () => {
    const router = new MdanRouter();

    router.page("/step-1", async () => ({
      page: page("step-1"),
      route: "/step-1",
      status: 202,
      headers: {
        "x-step": "1"
      },
      session: {
        type: "refresh" as const,
        session: {
          sid: "resolved"
        }
      }
    }));

    const request = {
      method: "GET" as const,
      url: "https://example.test/root",
      headers: {},
      cookies: {}
    };

    const result = await resolveAutoActionResult(
      {
        status: 200,
        route: "/root",
        headers: {
          "x-root": "1"
        },
        session: {
          type: "refresh",
          session: {
            sid: "current"
          }
        },
        page: page("root", "/step-1")
      },
      request,
      null,
      router,
      {}
    );

    expect(result.status).toBe(202);
    expect(result.route).toBe("/step-1");
    expect(result.headers).toEqual({
      "x-step": "1"
    });
    expect(result.session).toEqual({
      type: "refresh",
      session: {
        sid: "resolved"
      }
    });
    expect(result.page?.markdown).toContain("# step-1");
  });

  it("preserves resolved fragment status metadata during auto action resolution", async () => {
    const router = new MdanRouter();

    router.get("/step-1", async () => ({
      status: 202,
      route: "/step-1",
      headers: {
        "x-step": "1"
      },
      session: {
        type: "refresh" as const,
        session: {
          sid: "fragment"
        }
      },
      fragment: {
        markdown: "## Updated",
        blocks: []
      }
    }));

    const request = {
      method: "GET" as const,
      url: "https://example.test/root",
      headers: {},
      cookies: {}
    };

    const result = await resolveAutoActionResult(
      {
        status: 200,
        route: "/root",
        headers: {
          "x-root": "1"
        },
        session: {
          type: "refresh",
          session: {
            sid: "current"
          }
        },
        fragment: {
          markdown: "## Root",
          blocks: [
            {
              name: "main",
              operations: [
                {
                  method: "GET",
                  target: "/step-1",
                  name: "load-root",
                  inputs: [],
                  auto: true
                }
              ]
            }
          ]
        }
      },
      request,
      null,
      router,
      {}
    );

    expect(result.status).toBe(202);
    expect(result.route).toBe("/step-1");
    expect(result.headers).toEqual({
      "x-step": "1"
    });
    expect(result.session).toEqual({
      type: "refresh",
      session: {
        sid: "fragment"
      }
    });
    expect(result.fragment?.markdown).toBe("## Updated");
  });

  it("keeps current metadata when resolved fragment omits overrides", async () => {
    const router = new MdanRouter();

    router.get("/step-1", async () => ({
      fragment: {
        markdown: "## Updated Again",
        blocks: []
      }
    }));

    const request = {
      method: "GET" as const,
      url: "https://example.test/root",
      headers: {},
      cookies: {}
    };

    const result = await resolveAutoActionResult(
      {
        status: 201,
        route: "/root",
        headers: {
          "x-root": "1"
        },
        session: {
          type: "refresh",
          session: {
            sid: "current"
          }
        },
        fragment: {
          markdown: "## Root",
          blocks: [
            {
              name: "main",
              operations: [
                {
                  method: "GET",
                  target: "/step-1",
                  name: "load-root",
                  inputs: [],
                  auto: true
                }
              ]
            }
          ]
        }
      },
      request,
      null,
      router,
      {}
    );

    expect(result.status).toBe(201);
    expect(result.route).toBe("/root");
    expect(result.headers).toEqual({
      "x-root": "1"
    });
    expect(result.session).toEqual({
      type: "refresh",
      session: {
        sid: "current"
      }
    });
    expect(result.fragment?.markdown).toBe("## Updated Again");
  });

  it("strips source request body when auto follows a POST flow", async () => {
    const router = new MdanRouter();
    const seenBodies: Array<string | undefined> = [];

    router.get("/step-1", async ({ request }) => {
      seenBodies.push(request.body);
      return {
        fragment: {
          markdown: "## Auto Step",
          blocks: []
        }
      };
    });

    const result = await resolveAutoActionResult(
      {
        fragment: {
          markdown: "## Root",
          blocks: [
            {
              name: "main",
              operations: [
                {
                  method: "GET",
                  target: "/step-1",
                  name: "load-root",
                  inputs: [],
                  auto: true
                }
              ]
            }
          ]
        }
      },
      {
        method: "POST",
        url: "https://example.test/root",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ message: "hello" }),
        cookies: {}
      },
      null,
      router,
      {}
    );

    expect(seenBodies).toEqual([undefined]);
    expect(result.fragment?.markdown).toBe("## Auto Step");
  });
});
