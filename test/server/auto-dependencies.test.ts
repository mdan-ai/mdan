import { describe, expect, it } from "vitest";

import type { MdanPage } from "../../src/protocol/types.js";
import { createMdanServer } from "../../src/server/index.js";
import { resolveAutoDependencies } from "../../src/server/auto-dependencies.js";
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
    ],
    blockAnchors: ["main"]
  };
}

function envelope(name: string, autoTarget?: string) {
  return {
    content: `# ${name}`,
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
              verb: "read"
            }
          ]
        : []
    },
    view: {
      route_path: `/${name}`,
      regions: {
        main: name
      }
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
});
