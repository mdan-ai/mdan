import { PassThrough } from "node:stream";

import { describe, expect, it } from "vitest";

import { renderBrowserShell } from "../../src/server/browser-shell.js";
import { createHost as createBunHost } from "../../src/server/bun.js";
import { createMdanServer } from "../../src/server/index.js";
import { createNodeHost } from "../../src/server/node.js";
import type { MdanResponse } from "../../src/server/types.js";

function createSurface(message: string, route: string) {
  return {
    content: `# Demo\n\n::: block{id="main" actions="submit"}\n${message}\n:::`,
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
    view: {
      route_path: route,
      regions: {
        main: message
      }
    }
  };
}

describe("browser form bridge", () => {
  it("renders no-js forms in the browser shell snapshot", async () => {
    const html = renderBrowserShell({
      title: "Demo",
      initialSurface: createSurface("Current value", "/demo")
    });

    expect(html).toContain('<form action="/submit" method="post"');
    expect(html).toContain('name="count"');
    expect(html).toContain('type="number"');
    expect(html).toContain('name="mdan.input_schema"');
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

  it("bridges html form POST errors to an html page without changing the route", async () => {
    const host = createNodeHost(
      {
        async handle(): Promise<MdanResponse> {
          return {
            status: 400,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(createSurface("Count must be an integer", "/submit"))
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
