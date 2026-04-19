import { describe, expect, it, vi } from "vitest";

import { createHeadlessHost } from "../../src/surface/index.js";
import type { JsonSurfaceEnvelope } from "../../src/surface/adapter.js";

function surface(routePath: string, message: string, regions: Record<string, string> = { main: message }): JsonSurfaceEnvelope {
  return {
    content: `# ${message}\n\n::: block{id="main" actions="submit_message,patch_messages" trust="trusted"}\n${message}\n:::`,
    actions: {
      app_id: "demo",
      state_id: `demo:${routePath}:${message}`,
      state_version: 1,
      blocks: Object.keys(regions),
      actions: [
        {
          id: "submit_message",
          label: "Submit",
          verb: "write",
          target: "/messages",
          transport: { method: "POST" },
          state_effect: {
            response_mode: "page"
          },
          input_schema: {
            type: "object",
            required: ["message"],
            properties: {
              message: { type: "string" }
            },
            additionalProperties: false
          }
        },
        {
          id: "patch_messages",
          label: "Patch",
          verb: "write",
          target: "/messages/patch",
          transport: { method: "POST" },
          state_effect: {
            response_mode: "region",
            updated_regions: ["main"]
          },
          input_schema: {
            type: "object",
            properties: {},
            additionalProperties: false
          }
        }
      ],
      allowed_next_actions: ["submit_message", "patch_messages"]
    },
    view: {
      route_path: routePath,
      regions
    }
  };
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    text: async () => JSON.stringify(body)
  };
}

function expectJsonAcceptHeaders(input: unknown) {
  const headers = (input as { headers?: Headers }).headers;
  expect(headers).toBeInstanceOf(Headers);
  expect(headers?.get("Accept")).toBe("application/json");
}

describe("JSON-first headless host", () => {
  it("visits routes by requesting JSON bundles", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(surface("/demo", "Hello")));
    const host = createHeadlessHost({ fetchImpl: fetchImpl as unknown as typeof fetch });

    await host.visit("/demo");

    expect(fetchImpl).toHaveBeenCalledWith("/demo", expect.objectContaining({ method: "GET" }));
    expectJsonAcceptHeaders(fetchImpl.mock.calls[0]?.[1]);
    expect(host.getSnapshot()).toEqual(
      expect.objectContaining({
        status: "idle",
        transition: "page",
        route: "/demo",
        markdown: expect.stringContaining("# Hello")
      })
    );
    expect(host.getSnapshot().blocks[0]?.operations.map((operation) => operation.name)).toEqual([
      "submit_message",
      "patch_messages"
    ]);
  });

  it("submits actions by requesting JSON bundles", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(surface("/next", "Saved")));
    const host = createHeadlessHost({ initialSurface: surface("/start", "Start"), fetchImpl: fetchImpl as unknown as typeof fetch });
    const operation = host.getSnapshot().blocks[0]?.operations.find((candidate) => candidate.name === "submit_message");
    expect(operation).toBeTruthy();

    await host.submit(operation!, { message: "hello" });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/messages",
      expect.objectContaining({
        method: "POST",
        body: '{"input":{"message":"hello"}}'
      })
    );
    expectJsonAcceptHeaders(fetchImpl.mock.calls[0]?.[1]);
    expect(((fetchImpl.mock.calls[0]?.[1] as { headers?: Headers }).headers?.get("Content-Type"))).toBe("application/json");
    expect(host.getSnapshot().route).toBe("/next");
    expect(host.getSnapshot().markdown).toContain("Saved");
  });

  it("preserves typed POST values when submitting JSON bundles", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(surface("/next", "Saved")));
    const host = createHeadlessHost({ initialSurface: surface("/start", "Start"), fetchImpl: fetchImpl as unknown as typeof fetch });
    const operation = host.getSnapshot().blocks[0]?.operations.find((candidate) => candidate.name === "submit_message");
    expect(operation).toBeTruthy();

    await host.submit(operation!, {
      message: "hello",
      score: 4.2,
      enabled: true,
      settings: { mode: "fast" },
      tags: ["a", "b"]
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/messages",
      expect.objectContaining({
        method: "POST",
        body: '{"input":{"message":"hello","score":4.2,"enabled":true,"settings":{"mode":"fast"},"tags":["a","b"]}}'
      })
    );
  });

  it("includes action proof metadata when submitting GET actions", async () => {
    const initialSurface: JsonSurfaceEnvelope = {
      content: `# Start\n\n::: block{id="main" actions="filter_messages"}\nStart\n:::`,
      actions: {
        app_id: "demo",
        state_id: "demo:get-proof",
        state_version: 1,
        blocks: ["main"],
        actions: [
          {
            id: "filter_messages",
            label: "Filter",
            verb: "read",
            target: "/messages",
            transport: { method: "GET" },
            action_proof: "proof-token",
            submit_format: "mdan-action-input-v1",
            input_schema: {
              type: "object",
              properties: {
                q: { type: "string" }
              },
              additionalProperties: false
            }
          }
        ],
        allowed_next_actions: ["filter_messages"]
      },
      view: {
        route_path: "/start",
        regions: {
          main: "Start"
        }
      }
    };
    const fetchImpl = vi.fn(async () => jsonResponse(surface("/next", "Filtered")));
    const host = createHeadlessHost({ initialSurface, fetchImpl: fetchImpl as unknown as typeof fetch });
    const operation = host.getSnapshot().blocks[0]?.operations.find((candidate) => candidate.name === "filter_messages");
    expect(operation).toBeTruthy();

    await host.submit(operation!, { q: "hello" });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/messages?action.proof=proof-token&q=hello",
      expect.objectContaining({
        method: "GET"
      })
    );
    expectJsonAcceptHeaders(fetchImpl.mock.calls[0]?.[1]);
  });

  it("patches matching regions for region responses", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(surface("/dashboard", "New main", { main: "New main", side: "New side" })));
    const host = createHeadlessHost({
      initialSurface: surface("/dashboard", "Old main", { main: "Old main", side: "Old side" }),
      fetchImpl: fetchImpl as unknown as typeof fetch
    });
    const operation = host.getSnapshot().blocks[0]?.operations.find((candidate) => candidate.name === "patch_messages");
    expect(operation).toBeTruthy();

    await host.submit(operation!, {});

    expect(host.getSnapshot().transition).toBe("region");
    expect(host.getSnapshot().route).toBe("/dashboard");
    expect(host.getSnapshot().blocks.find((block) => block.name === "main")?.markdown).toBe("New main");
    expect(host.getSnapshot().blocks.find((block) => block.name === "side")?.markdown).toBe("Old side");
  });

  it("falls back to page replacement when a region response changes route", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(surface("/archive", "Archived", { main: "Archived" })));
    const host = createHeadlessHost({
      initialSurface: surface("/dashboard", "Old main", { main: "Old main", side: "Old side" }),
      fetchImpl: fetchImpl as unknown as typeof fetch
    });
    const operation = host.getSnapshot().blocks[0]?.operations.find((candidate) => candidate.name === "patch_messages");
    expect(operation).toBeTruthy();

    await host.submit(operation!, {});

    expect(host.getSnapshot().transition).toBe("page");
    expect(host.getSnapshot().route).toBe("/archive");
    expect(host.getSnapshot().blocks.find((block) => block.name === "main")?.markdown).toBe("Archived");
    expect(host.getSnapshot().blocks.find((block) => block.name === "side")).toBeUndefined();
  });

  it("moves to error state with parsed JSON surface content on non-2xx responses", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(surface("/missing", "## Not Found", {}), 404));
    const host = createHeadlessHost({ initialSurface: surface("/start", "Start"), fetchImpl: fetchImpl as unknown as typeof fetch });

    await host.visit("/missing");

    expect(host.getSnapshot().status).toBe("error");
    expect(host.getSnapshot().error).toContain("HTTP 404");
    expect(host.getSnapshot().error).toContain("Not Found");
  });
});
