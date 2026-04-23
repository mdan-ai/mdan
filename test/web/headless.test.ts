import { describe, expect, it, vi } from "vitest";

import { createHeadlessHost } from "../../src/surface/index.js";
import type { MdanActionManifest } from "../../src/protocol/surface.js";

type FixtureSurface = {
  content: string;
  actions: MdanActionManifest;
  view?: {
    route_path?: string;
    regions?: Record<string, string>;
  };
};

function surface(routePath: string, message: string, regions: Record<string, string> = { main: message }): FixtureSurface {
  return {
    content: `# ${message}\n\n::: block{id="main" actions="submit_message,patch_messages" trust="trusted"}`,
    actions: {
      app_id: "demo",
      state_id: `demo:${routePath}:${message}`,
      state_version: 1,
      blocks: Object.keys(regions),
      regions,
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

function artifactBody(body: FixtureSurface): string {
  const content = body.content.trim();
  const regionBlocks = Object.entries(body.view?.regions ?? {})
    .filter(([name]) => !new RegExp(`:::\\s*block\\{[^}]*\\bid="${name}"`).test(content))
    .map(([name]) => `::: block{id="${name}"}`)
    .join("\n\n");
  const markdown = [content, regionBlocks].filter(Boolean).join("\n\n");
  return `---
route: "${body.view?.route_path ?? "/"}"
---

${markdown}

\`\`\`mdan
${JSON.stringify(body.actions, null, 2)}
\`\`\`
`;
}

function artifactResponse(body: FixtureSurface, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    text: async () => artifactBody(body)
  };
}

function markdownResponse(routePath: string, message: string): string {
  return `---
route: "${routePath}"
---

# ${message}

::: block{id="main" actions="submit_message,patch_messages" trust="trusted"}

\`\`\`mdan
{
  "app_id": "demo",
  "state_id": "demo:${routePath}:${message}",
  "state_version": 1,
  "blocks": ["main"],
  "regions": {
    "main": "${message}"
  },
  "actions": [
    {
      "id": "submit_message",
      "label": "Submit",
      "verb": "write",
      "target": "/messages",
      "transport": { "method": "POST" },
      "state_effect": {
        "response_mode": "page"
      },
      "input_schema": {
        "type": "object",
        "required": ["message"],
        "properties": {
          "message": { "type": "string" }
        },
        "additionalProperties": false
      }
    },
    {
      "id": "patch_messages",
      "label": "Patch",
      "verb": "write",
      "target": "/messages/patch",
      "transport": { "method": "POST" },
      "state_effect": {
        "response_mode": "region",
        "updated_regions": ["main"]
      },
      "input_schema": {
        "type": "object",
        "properties": {},
        "additionalProperties": false
      }
    }
  ],
  "allowed_next_actions": ["submit_message", "patch_messages"]
}
\`\`\`
`;
}

function expectAcceptHeaders(input: unknown, value: string) {
  const headers = (input as { headers?: Headers }).headers;
  expect(headers).toBeInstanceOf(Headers);
  expect(headers?.get("Accept")).toBe(value);
}

describe("Markdown-first headless host", () => {
  it("visits routes by requesting markdown responses", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => markdownResponse("/demo", "Hello")
    }));
    const host = createHeadlessHost({ fetchImpl: fetchImpl as unknown as typeof fetch });

    await host.visit("/demo");

    expect(fetchImpl).toHaveBeenCalledWith("/demo", expect.objectContaining({ method: "GET" }));
    expectAcceptHeaders(fetchImpl.mock.calls[0]?.[1], "text/markdown");
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

  it("submits actions by requesting markdown responses", async () => {
    const fetchImpl = vi.fn(async () => artifactResponse(surface("/next", "Saved")));
    const host = createHeadlessHost({ initialMarkdown: artifactBody(surface("/start", "Start")), fetchImpl: fetchImpl as unknown as typeof fetch });
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
    expectAcceptHeaders(fetchImpl.mock.calls[0]?.[1], "text/markdown");
    expect(((fetchImpl.mock.calls[0]?.[1] as { headers?: Headers }).headers?.get("Content-Type"))).toBe("application/json");
    expect(host.getSnapshot().route).toBe("/next");
    expect(host.getSnapshot().markdown).toContain("Saved");
  });

  it("accepts markdown responses from POST actions while keeping JSON submits", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => markdownResponse("/next", "Saved from markdown")
    }));
    const host = createHeadlessHost({ initialMarkdown: artifactBody(surface("/start", "Start")), fetchImpl: fetchImpl as unknown as typeof fetch });
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
    expectAcceptHeaders(fetchImpl.mock.calls[0]?.[1], "text/markdown");
    expect(host.getSnapshot().route).toBe("/next");
    expect(host.getSnapshot().markdown).toContain("Saved from markdown");
  });

  it("preserves typed POST values while submitting for markdown responses", async () => {
    const fetchImpl = vi.fn(async () => artifactResponse(surface("/next", "Saved")));
    const host = createHeadlessHost({ initialMarkdown: artifactBody(surface("/start", "Start")), fetchImpl: fetchImpl as unknown as typeof fetch });
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

  it("includes action proof metadata when submitting GET actions over markdown reads", async () => {
    const initialSurface: FixtureSurface = {
      content: `# Start\n\n::: block{id="main" actions="filter_messages"}`,
      actions: {
        app_id: "demo",
        state_id: "demo:get-proof",
        state_version: 1,
        blocks: ["main"],
        regions: {
          main: "Start"
        },
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
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => markdownResponse("/next", "Filtered")
    }));
    const host = createHeadlessHost({ initialMarkdown: artifactBody(initialSurface), fetchImpl: fetchImpl as unknown as typeof fetch });
    const operation = host.getSnapshot().blocks[0]?.operations.find((candidate) => candidate.name === "filter_messages");
    expect(operation).toBeTruthy();

    await host.submit(operation!, { q: "hello" });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/messages?action.proof=proof-token&q=hello",
      expect.objectContaining({
        method: "GET"
      })
    );
    expectAcceptHeaders(fetchImpl.mock.calls[0]?.[1], "text/markdown");
    expect(host.getSnapshot().markdown).toContain("# Filtered");
  });

  it("patches matching regions for region responses", async () => {
    const fetchImpl = vi.fn(async () => artifactResponse(surface("/dashboard", "New main", { main: "New main", side: "New side" })));
    const host = createHeadlessHost({
      initialMarkdown: artifactBody(surface("/dashboard", "Old main", { main: "Old main", side: "Old side" })),
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
    const fetchImpl = vi.fn(async () => artifactResponse(surface("/archive", "Archived", { main: "Archived" })));
    const host = createHeadlessHost({
      initialMarkdown: artifactBody(surface("/dashboard", "Old main", { main: "Old main", side: "Old side" })),
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

  it("moves to error state with parsed markdown content on non-2xx responses", async () => {
    const fetchImpl = vi.fn(async () => artifactResponse(surface("/missing", "## Not Found", {}), 404));
    const host = createHeadlessHost({ initialMarkdown: artifactBody(surface("/start", "Start")), fetchImpl: fetchImpl as unknown as typeof fetch });

    await host.visit("/missing");

    expect(host.getSnapshot().status).toBe("error");
    expect(host.getSnapshot().error).toContain("HTTP 404");
    expect(host.getSnapshot().error).toContain("Not Found");
  });

  it("keeps plain markdown runtime errors readable", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 406,
      statusText: "Not Acceptable",
      text: async () => "## Not Acceptable\n\nUse text/markdown."
    }));
    const host = createHeadlessHost({ initialMarkdown: artifactBody(surface("/start", "Start")), fetchImpl: fetchImpl as unknown as typeof fetch });

    await host.visit("/missing");

    expect(host.getSnapshot().status).toBe("error");
    expect(host.getSnapshot().markdown).toContain("## Not Acceptable");
    expect(host.getSnapshot().error).toContain("HTTP 406");
    expect(host.getSnapshot().error).toContain("Not Acceptable");
  });

  it("does not treat POST action targets as the next semantic route when the markdown omits one", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => `# Saved

\`\`\`mdan
{
  "app_id": "demo",
  "state_id": "demo:saved",
  "state_version": 1,
  "blocks": [],
  "actions": [
    {
      "id": "submit_message",
      "label": "Submit",
      "verb": "write",
      "target": "/messages",
      "transport": { "method": "POST" },
      "input_schema": {
        "type": "object",
        "required": ["message"],
        "properties": {
          "message": { "type": "string" }
        },
        "additionalProperties": false
      }
    }
  ],
  "allowed_next_actions": ["submit_message"]
}
\`\`\`
`
    }));
    const host = createHeadlessHost({ initialMarkdown: artifactBody(surface("/start", "Start")), fetchImpl: fetchImpl as unknown as typeof fetch });
    const operation = host.getSnapshot().blocks[0]?.operations.find((candidate) => candidate.name === "submit_message");
    expect(operation).toBeTruthy();

    await host.submit(operation!, { message: "hello" });

    expect(host.getSnapshot().transition).toBe("page");
    expect(host.getSnapshot().route).toBe("/start");
    expect(host.getSnapshot().markdown).toContain("# Saved");
  });

  it("can bootstrap from an initial markdown response", () => {
    const host = createHeadlessHost({
      initialMarkdown: markdownResponse("/markdown", "Markdown Start"),
      initialRoute: "/markdown"
    });

    expect(host.getSnapshot().route).toBe("/markdown");
    expect(host.getSnapshot().markdown).toContain("# Markdown Start");
    expect(host.getSnapshot().blocks[0]?.operations.map((operation) => operation.name)).toEqual([
      "submit_message",
      "patch_messages"
    ]);
  });

  it("can bootstrap from markdown that contains an extra mdan example block", () => {
    const host = createHeadlessHost({
      initialMarkdown: `# Markdown Start

Markdown block.

::: block{id="main" actions="submit_message"}

\`\`\`mdan
example only
\`\`\`

\`\`\`mdan
{
  "app_id": "demo",
  "state_id": "demo:/markdown:Markdown Start",
  "state_version": 1,
  "blocks": ["main"],
  "actions": [
    {
      "id": "submit_message",
      "label": "Submit",
      "verb": "write",
      "target": "/messages",
      "transport": { "method": "POST" },
      "input_schema": {
        "type": "object",
        "required": ["message"],
        "properties": {
          "message": { "type": "string" }
        },
        "additionalProperties": false
      }
    }
  ],
  "allowed_next_actions": ["submit_message"]
}
\`\`\`
`,
      initialRoute: "/markdown"
    });

    expect(host.getSnapshot().route).toBe("/markdown");
    expect(host.getSnapshot().markdown).toContain("example only");
    expect(host.getSnapshot().blocks[0]?.operations.map((operation) => operation.name)).toEqual([
      "submit_message"
    ]);
  });
});
