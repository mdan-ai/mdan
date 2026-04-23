import { describe, expect, it } from "vitest";

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
      blocks: ["main"],
      actions: autoTarget
        ? [
            {
              id: `load-${name}`,
              target: autoTarget,
              transport: { method: "GET" },
              verb: "read",
              auto: true
            }
          ]
        : []
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
    const defaulted = await resolveAutoDependencies(page("root", "/step-1"), request, null, router, {});
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

  it("applies page auto dependencies before rendering html page reads", async () => {
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

    expect(response.status).toBe(200);
    expect(String(response.body)).toContain("step-1");
    expect(String(response.body)).not.toContain(">root<");
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

::: block{id="main" actions="missing_action"}`,
      actions: {
        app_id: "auto-test",
        state_id: "auto-test:broken",
        state_version: 1,
        actions: [
          {
            id: "open",
            verb: "route",
            target: "/open"
          }
        ]
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

::: block{id="main"}`,
      actions: {
        app_id: "auto-test",
        actions: []
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

::: block{id="main" actions="missing_action"}`,
      actions: {
        app_id: "auto-test",
        state_id: "auto-test:broken",
        state_version: 1,
        actions: [
          {
            id: "open",
            verb: "route",
            target: "/open"
          }
        ]
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
});
