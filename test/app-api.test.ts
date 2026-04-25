import { afterEach, describe, expect, it, vi } from "vitest";

import { createApp, fields, type InferAppInputs } from "../src/app/index.js";
import type { MdanActionManifest } from "../src/core/index.js";
import { parseFrontmatter } from "../src/content/content-actions.js";

function extractExecutable(markdown: string) {
  const match = markdown.match(/```mdan\n([\s\S]*?)\n```/);
  expect(match?.[1]).toBeTruthy();
  return JSON.parse(String(match?.[1])) as {
    actions?: Record<string, Record<string, unknown>>;
    blocks?: Record<string, { actions?: string[] }>;
  };
}

function starterManifest(overrides: Partial<MdanActionManifest> = {}): MdanActionManifest {
  return {
    version: "mdan.page.v1",
    blocks: {
      main: {
        actions: ["submit_message"]
      }
    },
    actions: {
      submit_message: {
        label: "Submit",
        verb: "write",
        target: "/post",
        transport: { method: "POST" },
        input_schema: {
          type: "object",
          required: ["message"],
          properties: {
            message: { type: "string" }
          },
          additionalProperties: false
        }
      }
    },
    ...overrides
  };
}

describe("app API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds markdown pages from explicit action json manifests", async () => {
    const app = createApp({ appId: "starter" });
    const messages = ["Booted"];
    const home = app.page("/", {
      markdown: "# Starter\n\n<!-- mdan:block id=\"main\" -->",
      actionJson: {
        ...starterManifest(),
        blocks: {
          main: {
            actions: ["refresh_main", "submit_message"]
          }
        },
        actions: {
          refresh_main: {
            label: "Refresh",
            verb: "read",
            target: "/",
            transport: { method: "GET" },
            input_schema: {
              type: "object",
              properties: {},
              additionalProperties: false
            }
          },
          ...starterManifest().actions
        }
      },
      render() {
        return {
          main: messages.map((message) => `- ${message}`).join("\n")
        };
      }
    });

    app.route(home);

    const response = await app.handle({
      method: "GET",
      url: "https://example.test/",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    const body = String(response.body);
    expect(body).toContain("# Starter");
    expect(body).toContain("Booted");
    expect(parseFrontmatter(body).route).toBe("/");

    const executable = extractExecutable(body);
    expect(executable.blocks).toMatchObject({
      main: {
        actions: ["refresh_main", "submit_message"]
      }
    });
    expect(executable.actions?.submit_message?.target).toBe("/post");
  });

  it("returns defensive action json copies for explicit manifests", () => {
    const app = createApp({ appId: "starter" });
    const page = app.page("/", {
      markdown: "# Starter\n\n<!-- mdan:block id=\"main\" -->",
      actionJson: starterManifest({
        app_id: "starter",
        state_id: "starter:index",
        state_version: 1
      }),
      render() {
        return { main: "- ready" };
      }
    });

    const first = page.actionJson();
    first.actions!.submit_message!.label = "Mutated";

    expect(page.actionJson()).toEqual({
      version: "mdan.page.v1",
      app_id: "starter",
      state_id: "starter:index",
      state_version: 1,
      blocks: {
        main: {
          actions: ["submit_message"]
        }
      },
      actions: {
        submit_message: {
          label: "Submit",
          verb: "write",
          target: "/post",
          transport: { method: "POST" },
          input_schema: {
            type: "object",
            required: ["message"],
            properties: {
              message: { type: "string" }
            },
            additionalProperties: false
          }
        }
      }
    });
    expect(page.bind().actionJson()).toEqual(page.actionJson());
  });

  it("handles requests without explicit cookies payload", async () => {
    const app = createApp({ appId: "starter" });
    const home = app.page("/", {
      markdown: "# Starter\n\n<!-- mdan:block id=\"main\" -->",
      actionJson: {
        version: "mdan.page.v1",
        blocks: {
          main: {
            actions: []
          }
        },
        actions: {}
      },
      render() {
        return { main: "- Booted" };
      }
    });
    app.route(home);

    const response = await app.handle({
      method: "GET",
      url: "https://example.test/",
      headers: { accept: "text/markdown" }
    });

    expect(response.status).toBe(200);
    expect(String(response.body)).toContain("Booted");
  });

  it("can reuse a defined page across page and action handlers", async () => {
    const app = createApp({ appId: "starter" });
    const messages = ["Booted"];
    const home = app.page("/", {
      markdown: "# Starter\n\n<!-- mdan:block id=\"main\" -->",
      actionJson: starterManifest(),
      render(currentMessages: string[]) {
        return {
          main: currentMessages.map((message) => `- ${message}`).join("\n")
        };
      }
    });

    app.route(home.bind(messages));
    app.action("/post", async ({ inputs }) => {
      const message = String(inputs.message ?? "").trim();
      if (message) {
        messages.unshift(message);
      }
      return home.bind(messages).render();
    });

    const page = await app.handle({
      method: "GET",
      url: "https://example.test/",
      headers: { accept: "text/markdown" },
      cookies: {}
    });
    const proof = extractExecutable(String(page.body)).actions?.submit_message?.action_proof;
    expect(typeof proof).toBe("string");

    const post = await app.handle({
      method: "POST",
      url: "https://example.test/post",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        action: {
          proof
        },
        input: {
          message: "Hello"
        }
      }),
      cookies: {}
    });

    expect(post.status).toBe(200);
    expect(String(post.body)).toContain("Hello");
  });

  it("supports GET actions via app.action method option", async () => {
    const app = createApp({
      appId: "starter",
      actionProof: { disabled: true }
    });
    const lookup = app.page("/lookup", {
      markdown: "# Lookup\n\n<!-- mdan:block id=\"main\" -->",
      actionJson: {
        version: "mdan.page.v1",
        blocks: {
          main: {
            actions: []
          }
        },
        actions: {}
      },
      render(message: string) {
        return {
          main: message
        };
      }
    });

    app.action("/lookup", { method: "GET" }, ({ inputs }) => {
      const name = String(inputs.name ?? "unknown");
      return lookup.bind(`name=${name}`).render();
    });

    const response = await app.handle({
      method: "GET",
      url: "https://example.test/lookup?name=Beijing",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(String(response.body)).toContain("name=Beijing");
  });

  it("supports explicit app.read and app.write helpers", async () => {
    const app = createApp({
      appId: "starter",
      actionProof: { disabled: true }
    });
    const page = app.page("/profile", {
      markdown: "# Profile\n\n<!-- mdan:block id=\"main\" -->",
      actionJson: {
        version: "mdan.page.v1",
        blocks: {
          main: {
            actions: []
          }
        },
        actions: {}
      },
      render(content: string) {
        return {
          main: content
        };
      }
    });

    app.read("/profile/data", ({ inputs }) => {
      const name = String(inputs.name ?? "unknown");
      return page.bind(`read:${name}`).render();
    });
    app.write("/profile/save", ({ inputs }) => {
      const name = String(inputs.name ?? "unknown");
      return page.bind(`write:${name}`).render();
    });

    const readResponse = await app.handle({
      method: "GET",
      url: "https://example.test/profile/data?name=Ada",
      headers: { accept: "text/markdown" },
      cookies: {}
    });
    expect(readResponse.status).toBe(200);
    expect(String(readResponse.body)).toContain("read:Ada");

    const writeResponse = await app.handle({
      method: "POST",
      url: "https://example.test/profile/save",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        action: { id: "manual", proof: "manual" },
        input: {
          name: "Ada"
        }
      }),
      cookies: {}
    });

    expect(writeResponse.status).toBe(200);
    expect(String(writeResponse.body)).toContain("write:Ada");
  });

  it("rejects GET read handlers on paths already owned by app.route", () => {
    const app = createApp({
      appId: "starter",
      actionProof: { disabled: true }
    });
    const home = app.page("/", {
      markdown: "# Home\n\n<!-- mdan:block id=\"main\" -->",
      actionJson: {
        version: "mdan.page.v1",
        blocks: { main: { actions: [] } },
        actions: {}
      },
      render() {
        return { main: "- ready" };
      }
    });
    app.route(home);

    expect(() => app.read("/", () => home.render())).toThrow(
      '[mdan-sdk] app.read cannot register "/" because app.route already owns this GET page route. Use app.route for page reads and keep app.read on a dedicated data endpoint.'
    );
  });

  it("rejects app.route registration on paths already owned by GET handlers", () => {
    const app = createApp({
      appId: "starter",
      actionProof: { disabled: true }
    });
    const home = app.page("/", {
      markdown: "# Home\n\n<!-- mdan:block id=\"main\" -->",
      actionJson: {
        version: "mdan.page.v1",
        blocks: { main: { actions: [] } },
        actions: {}
      },
      render() {
        return { main: "- ready" };
      }
    });
    app.read("/", () => home.render());

    expect(() => app.route(home)).toThrow(
      '[mdan-sdk] app.route cannot register "/" because app.read/app.action(GET) already owns this GET endpoint. Use a dedicated app.read path for data reads.'
    );
  });

  it("supports richer schema builders for manifest authoring", () => {
    const input = {
      location: fields.string({ required: true, minLength: 1 }),
      range: fields.enum(["current", "today", "3d"] as const, { required: true }),
      date: fields.date(),
      updated_at: fields.datetime(),
      thresholds: fields.array(fields.number({ min: 0, max: 100 }), { minItems: 1 }),
      filters: fields.object(
        {
          locale: fields.string({ required: true, pattern: "^[a-z]{2}(-[A-Z]{2})?$" }),
          includeWind: fields.boolean()
        },
        { required: true }
      )
    } as const;

    expect(input).toMatchObject({
      location: { schema: { type: "string", minLength: 1 }, required: true },
      range: { schema: { type: "string", enum: ["current", "today", "3d"] }, required: true },
      date: { schema: { type: "string", format: "date" } },
      updated_at: { schema: { type: "string", format: "date-time" } },
      thresholds: {
        schema: {
          type: "array",
          minItems: 1,
          items: { type: "number", minimum: 0, maximum: 100 }
        }
      },
      filters: {
        schema: {
          type: "object",
          required: ["locale"],
          additionalProperties: false,
          properties: {
            locale: { type: "string", pattern: "^[a-z]{2}(-[A-Z]{2})?$" },
            includeWind: { type: "boolean" }
          }
        },
        required: true
      }
    });
  });

  it("can infer handler input types from field maps", async () => {
    const app = createApp({
      appId: "starter",
      actionProof: { disabled: true }
    });
    const input = {
      location: fields.string({ required: true }),
      range: fields.enum(["current", "today"] as const),
      options: fields.object(
        {
          locale: fields.string({ required: true }),
          includeWind: fields.boolean()
        },
        { required: true }
      )
    } as const;

    type QueryInputs = InferAppInputs<typeof input>;

    const result = app.page("/typed", {
      markdown: "# Typed\n\n<!-- mdan:block id=\"main\" -->",
      actionJson: {
        version: "mdan.page.v1",
        blocks: {
          main: {
            actions: []
          }
        },
        actions: {}
      },
      render(content: string) {
        return { main: content };
      }
    });

    app.action<QueryInputs>("/typed", async ({ inputs }) => {
      const location = inputs.location;
      const range = inputs.range ?? "current";
      const locale = inputs.options.locale;
      return result.bind(`${location}:${range}:${locale}`).render();
    });

    const response = await app.handle({
      method: "POST",
      url: "https://example.test/typed",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        action: { id: "manual", proof: "manual" },
        input: {
          location: "Beijing",
          range: "today",
          options: {
            locale: "zh-CN"
          }
        }
      }),
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(String(response.body)).toContain("Beijing:today:zh-CN");
  });

  it("supports app-level dynamic auto request resolvers", async () => {
    const app = createApp({
      appId: "starter",
      actionProof: { disabled: true },
      auto: {
        resolveRequest({ action, sourceRequest }) {
          if (action.name !== "resolve_root") {
            return null;
          }
          const source = new URL(sourceRequest.url);
          const target = new URL(action.target, sourceRequest.url);
          const location = source.searchParams.get("location");
          if (location) {
            target.searchParams.set("location", location);
          }
          return {
            ...sourceRequest,
            method: "GET",
            url: target.toString()
          };
        }
      }
    });

    const home = app.page("/", {
      markdown: "# Home\n\n<!-- mdan:block id=\"main\" -->",
      actionJson: {
        version: "mdan.page.v1",
        blocks: {
          main: { actions: ["resolve_root"] }
        },
        actions: {
          resolve_root: {
            label: "Resolve",
            verb: "read",
            target: "/resolve",
            auto: true,
            transport: { method: "GET" },
            input_schema: {
              type: "object",
              properties: {
                location: { type: "string" }
              },
              additionalProperties: false
            }
          }
        }
      },
      render(content: string) {
        return { main: content };
      }
    });

    app.route(home.bind("root"));
    app.read("/resolve", ({ inputs }) => home.bind(String(inputs.location ?? "missing")).render());

    const response = await app.handle({
      method: "GET",
      url: "https://example.test/?location=hangzhou",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(String(response.body)).toContain("hangzhou");
  });

});
