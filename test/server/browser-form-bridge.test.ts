import { PassThrough } from "node:stream";

import { describe, expect, it } from "vitest";

import { renderBrowserShell } from "../../src/server/browser-shell.js";
import { createHost as createBunHost } from "../../src/server/bun.js";
import { createMdanServer } from "../../src/server/index.js";
import { createNodeHost } from "../../src/server/node.js";
import type { MdanResponse } from "../../src/server/types.js";

function createSurface(message: string, route: string) {
  return {
    markdown: `# Demo\n\n::: block{id="main" actions="submit"}\n${message}\n:::`,
    actions: {
      app_id: "demo",
      state_id: `demo:${route}:1`,
      state_version: 1,
      blocks: ["main"],
      actions: [
        {
          id: "submit",
          label: "Submit",
          verb: "write",
          transport: { method: "POST" },
          target: "/submit",
          input_schema: {
            type: "object",
            required: ["count"],
            properties: {
              count: { type: "integer" }
            },
            additionalProperties: false
          }
        }
      ],
      allowed_next_actions: ["submit"]
    },
    route,
    regions: {
      main: message
    }
  };
}

function createGetSurface(message: string, route: string) {
  return {
    markdown: `# Weather\n\n::: block{id="main" actions="query"}\nQuery weather\n:::`,
    actions: {
      app_id: "weather",
      state_id: `weather:${route}:1`,
      state_version: 1,
      blocks: ["main"],
      actions: [
        {
          id: "query",
          label: "Query Weather",
          verb: "read",
          transport: { method: "GET" },
          target: "/",
          input_schema: {
            type: "object",
            required: ["location"],
            properties: {
              location: { type: "string" },
              range: { type: "string", enum: ["current", "3d"] },
              emoji: { type: "boolean", default: true }
            },
            additionalProperties: false
          }
        }
      ],
      allowed_next_actions: ["query"]
    },
    route,
    regions: {
      main: message
    }
  };
}

describe("browser form bridge", () => {
  it("renders no-js forms in the browser shell snapshot", async () => {
    const html = renderBrowserShell({
      title: "Demo",
      initialReadableSurface: createSurface("Current value", "/demo")
    });

    expect(html).toContain('<form action="/submit" method="post"');
    expect(html).toContain('name="count"');
    expect(html).toContain('type="number"');
    expect(html).toContain('name="mdan.input_schema"');
  });

  it("does not leak embedded input schema metadata into GET query forms", async () => {
    const html = renderBrowserShell({
      title: "Weather",
      initialReadableSurface: createGetSurface("Query weather", "/")
    });

    expect(html).toContain('<form action="/" method="get"');
    expect(html).toContain('onsubmit="for (const el of this.querySelectorAll(');
    expect(html).not.toContain('name="mdan.input_schema"');
    expect(html).toContain('<option value="" selected>default</option>');
    expect(html).toContain('type="checkbox" name="emoji" value="true" checked');
    expect(html).not.toContain('type="hidden" name="emoji" value="false"');
  });

  it("bridges html form POST success to a 303 redirect on the returned route", async () => {
    const server = createMdanServer();
    let receivedCount: unknown;
    server.post("/submit", async ({ inputs }) => {
      receivedCount = inputs.count;
      return createSurface(`Saved ${String(inputs.count ?? "?")}`, "/done");
    });
    const host = createBunHost(server, {
      browserShell: {
        title: "Demo"
      }
    });

    const form = new URLSearchParams();
    form.set("count", "4");
    form.set(
      "mdan.input_schema",
      JSON.stringify({
        type: "object",
        required: ["count"],
        properties: {
          count: { type: "integer" }
        },
        additionalProperties: false
      })
    );

    const response = await host(
      new Request("https://example.test/submit", {
        method: "POST",
        headers: {
          accept: "text/html",
          "content-type": "application/x-www-form-urlencoded"
        },
        body: form
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/done");
    expect(receivedCount).toBe(4);
  });

  it("keeps set-cookie headers when a browser-form success redirects", async () => {
    const host = createNodeHost(
      {
        async handle(): Promise<MdanResponse> {
          return {
            status: 200,
            headers: {
              "content-type": 'text/markdown; profile="https://mdan.ai/spec/v1"',
              "set-cookie": "session=abc; Path=/; HttpOnly"
            },
            body: `---
route: "/done"
---

# Done

\`\`\`mdan
{
  "app_id": "demo",
  "state_id": "demo:done:1",
  "state_version": 1,
  "blocks": [],
  "actions": [],
  "allowed_next_actions": []
}
\`\`\`
`
          };
        }
      },
      {
        browserShell: {
          title: "Demo"
        }
      }
    );

    const response = await new Promise<{ status: number; headers: Record<string, string | string[]>; body: string }>((resolve, reject) => {
      const request = new PassThrough() as any;
      request.method = "POST";
      request.url = "/submit";
      request.headers = {
        host: "example.test",
        accept: "text/html",
        "content-type": "application/x-www-form-urlencoded"
      };

      const chunks: Buffer[] = [];
      const reply = new PassThrough() as any;
      reply.statusCode = 200;
      const headers: Record<string, string | string[]> = {};
      reply.setHeader = (key: string, value: string | string[]) => {
        headers[key.toLowerCase()] = value;
      };
      reply.write = (chunk: string | Buffer) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      };
      reply.end = (chunk?: string | Buffer) => {
        if (chunk) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        resolve({
          status: reply.statusCode,
          headers,
          body: Buffer.concat(chunks).toString("utf8")
        });
      };
      reply.on("error", reject);

      host(request, reply);
      request.end("count=4");
    });

    expect(response.status).toBe(303);
    expect(String(response.headers["set-cookie"])).toContain("session=abc");
    expect(String(response.headers["location"])).toBe("/done");
  });

  it("renders successful markdown responses without a route as html instead of leaking raw markdown", async () => {
    const host = createNodeHost(
      {
        async handle(): Promise<MdanResponse> {
          return {
            status: 200,
            headers: { "content-type": 'text/markdown; profile="https://mdan.ai/spec/v1"' },
            body: "# Saved\n\nSubmitted successfully."
          };
        }
      },
      {
        browserShell: {
          title: "Demo"
        }
      }
    );

    const response = await new Promise<{ status: number; headers: Record<string, string | string[]>; body: string }>((resolve, reject) => {
      const request = new PassThrough() as any;
      request.method = "POST";
      request.url = "/submit";
      request.headers = {
        host: "example.test",
        accept: "text/html",
        "content-type": "application/x-www-form-urlencoded"
      };

      const chunks: Buffer[] = [];
      const reply = new PassThrough() as any;
      reply.statusCode = 200;
      const headers: Record<string, string | string[]> = {};
      reply.setHeader = (key: string, value: string | string[]) => {
        headers[key.toLowerCase()] = value;
      };
      reply.write = (chunk: string | Buffer) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      };
      reply.end = (chunk?: string | Buffer) => {
        if (chunk) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        resolve({
          status: reply.statusCode,
          headers,
          body: Buffer.concat(chunks).toString("utf8")
        });
      };
      reply.on("error", reject);

      host(request, reply);
      request.end("count=4");
    });

    expect(response.status).toBe(200);
    expect(String(response.headers["content-type"])).toContain("text/html");
    expect(response.body).toContain("Submitted successfully.");
    expect(response.body).not.toContain("```mdan");
  });

  it("bridges html form POST errors to an html page without changing the route", async () => {
    const host = createNodeHost(
      {
        async handle(): Promise<MdanResponse> {
          return {
            status: 400,
            headers: { "content-type": 'text/markdown; profile="https://mdan.ai/spec/v1"' },
            body: `---
route: "/submit"
---

# Demo

::: block{id="main" actions="submit"}
Count must be an integer
:::

\`\`\`mdan
{
  "app_id": "demo",
  "state_id": "demo:/submit:1",
  "state_version": 1,
  "blocks": ["main"],
  "actions": [
    {
      "id": "submit",
      "label": "Submit",
      "verb": "write",
      "transport": { "method": "POST" },
      "target": "/submit",
      "input_schema": {
        "type": "object",
        "required": ["count"],
        "properties": {
          "count": { "type": "integer" }
        },
        "additionalProperties": false
      },
      "block": "main"
    }
  ],
  "allowed_next_actions": ["submit"]
}
\`\`\`
`
          };
        }
      },
      {
        browserShell: {
          title: "Demo"
        }
      }
    );

    const response = await new Promise<{ status: number; headers: Record<string, string | string[]>; body: string }>((resolve, reject) => {
      const request = new PassThrough() as any;
      request.method = "POST";
      request.url = "/submit";
      request.headers = {
        host: "example.test",
        accept: "text/html",
        "content-type": "application/x-www-form-urlencoded"
      };

      const chunks: Buffer[] = [];
      const reply = new PassThrough() as any;
      reply.statusCode = 200;
      const headers: Record<string, string | string[]> = {};
      reply.setHeader = (key: string, value: string | string[]) => {
        headers[key.toLowerCase()] = value;
      };
      reply.write = (chunk: string | Buffer) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      };
      reply.end = (chunk?: string | Buffer) => {
        if (chunk) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        resolve({
          status: reply.statusCode,
          headers,
          body: Buffer.concat(chunks).toString("utf8")
        });
      };
      reply.on("error", reject);

      host(request, reply);
      request.end("count=nope");
    });

    expect(response.status).toBe(400);
    expect(String(response.headers["content-type"])).toContain("text/html");
    expect(response.body).toContain("Count must be an integer");
    expect(response.body).toContain('<form action="/submit" method="post"');
  });
});
