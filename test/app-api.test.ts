import { afterEach, describe, expect, it, vi } from "vitest";

import { actions, createApp, fields, type InferAppInputs } from "../src/index.js";
import { parseFrontmatter } from "../src/content/content-actions.js";

function extractExecutable(markdown: string) {
  const match = markdown.match(/```mdan\n([\s\S]*?)\n```/);
  expect(match?.[1]).toBeTruthy();
  return JSON.parse(String(match?.[1])) as {
    actions?: Array<Record<string, unknown>>;
    allowed_next_actions?: string[];
  };
}

describe("app API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds starter-style pages with page configs", async () => {
    const app = createApp({ appId: "starter" });
    const messages = ["Booted"];
    const home = app.page("/", {
      markdown: "# Starter\n\n::: block{id=\"main\" actions=\"refresh_main,submit_message\" trust=\"untrusted\"}\n:::",
      actions: [
        actions.read("refresh_main", {
          label: "Refresh",
          target: "/"
        }),
        actions.write("submit_message", {
          label: "Submit",
          target: "/post",
          input: {
            message: fields.string({ required: true })
          }
        })
      ],
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
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/markdown");
    const body = String(response.body);
    expect(body).toContain("# Starter");
    expect(body).toContain("Booted");

    const frontmatter = parseFrontmatter(body);
    expect(frontmatter.route).toBe("/");

    const executable = extractExecutable(body);
    expect(executable.allowed_next_actions).toEqual(["refresh_main", "submit_message"]);
    expect(executable.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "refresh_main",
          verb: "read",
          target: "/"
        }),
        expect.objectContaining({
          id: "submit_message",
          verb: "write",
          target: "/post",
          input_schema: expect.objectContaining({
            required: ["message"],
            properties: {
              message: {
                type: "string"
              }
            }
          })
        })
      ])
    );
  });

  it("normalizes route-like actions to verb=route", async () => {
    const app = createApp({ appId: "starter" });
    const home = app.page("/", {
      markdown: "# Starter\n\n::: block{id=\"main\" actions=\"open_docs,open_help\"}\n:::",
      actions: [
        actions.route("open_docs", {
          label: "Open Docs",
          target: "/docs"
        }),
        actions.route("open_help", {
          label: "Open Help",
          target: "/help"
        })
      ],
      render() {
        return {
          main: "- ready"
        };
      }
    });

    app.route(home);

    const response = await app.handle({
      method: "GET",
      url: "https://example.test/",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(response.status).toBe(200);
    const executable = extractExecutable(String(response.body));
    const openDocs = executable.actions?.find((action) => action.id === "open_docs");
    const openHelp = executable.actions?.find((action) => action.id === "open_help");
    expect(openDocs).toEqual(expect.objectContaining({ verb: "route", transport: { method: "GET" } }));
    expect(openHelp).toEqual(expect.objectContaining({ verb: "route", transport: { method: "GET" } }));
  });

  it("handles requests without explicit cookies payload", async () => {
    const app = createApp({ appId: "starter" });
    const home = app.page("/", {
      markdown: "# Starter\n\n::: block{id=\"main\"}\n:::",
      render() {
        return { main: "- Booted" };
      }
    });
    app.route(home);

    const response = await app.handle({
      method: "GET",
      url: "https://example.test/",
      headers: {
        accept: "text/markdown"
      }
    });

    expect(response.status).toBe(200);
    expect(String(response.body)).toContain("Booted");
  });

  it("can reuse a defined page across page and action handlers", async () => {
    const app = createApp({ appId: "starter" });
    const messages = ["Booted"];
    const home = app.page("/", {
      markdown: "# Starter\n\n::: block{id=\"main\" actions=\"submit_message\" trust=\"untrusted\"}\n:::",
      actions: [
        actions.write("submit_message", {
          label: "Submit",
          target: "/post",
          input: {
            message: fields.string({ required: true })
          }
        })
      ],
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
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });
    const executable = extractExecutable(String(page.body));
    const submit = executable.actions?.find((action) => action.id === "submit_message");
    expect(typeof submit?.action_proof).toBe("string");

    const post = await app.handle({
      method: "POST",
      url: "https://example.test/post",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        action: {
          proof: String(submit?.action_proof)
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
      markdown: "# Lookup\n\n::: block{id=\"main\"}\n:::",
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
      headers: {
        accept: "text/markdown"
      },
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
      markdown: "# Profile\n\n::: block{id=\"main\"}\n:::",
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
      headers: {
        accept: "text/markdown"
      },
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
      markdown: "# Home\n\n::: block{id=\"main\"}\n:::",
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
      markdown: "# Home\n\n::: block{id=\"main\"}\n:::",
      render() {
        return { main: "- ready" };
      }
    });
    app.read("/", () => home.render());

    expect(() => app.route(home)).toThrow(
      '[mdan-sdk] app.route cannot register "/" because app.read/app.action(GET) already owns this GET endpoint. Use a dedicated app.read path for data reads.'
    );
  });

  it("warns when declared action transport and app.action registration method do not match", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const app = createApp({
      appId: "starter",
      actionProof: { disabled: true }
    });
    const home = app.page("/", {
      markdown: "# Starter\n\n::: block{id=\"main\" actions=\"lookup\"}\n:::",
      actions: [
        actions.read("lookup", {
          label: "Lookup",
          target: "/lookup",
          transport: { method: "GET" }
        })
      ],
      render() {
        return {
          main: "- ready"
        };
      }
    });

    app.route(home);
    app.action("/lookup", async () => home.render());

    const response = await app.handle({
      method: "GET",
      url: "https://example.test/",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(warnSpy).toHaveBeenCalledWith(
      '[mdan-sdk] Action transport mismatch on "/lookup": declared GET action but no matching app.action handler is registered.'
    );
    expect(warnSpy).toHaveBeenCalledWith(
      '[mdan-sdk] Action transport mismatch on "/lookup": app.action registered POST handler, but no page action declares that method for this target.'
    );
  });

  it("does not warn for GET read actions that target registered page routes", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const app = createApp({
      appId: "starter",
      actionProof: { disabled: true }
    });
    const home = app.page("/", {
      markdown: "# Starter\n\n::: block{id=\"main\" actions=\"refresh_main\"}\n:::",
      actions: [
        actions.read("refresh_main", {
          label: "Refresh",
          target: "/",
          transport: { method: "GET" }
        })
      ],
      render() {
        return {
          main: "- ready"
        };
      }
    });

    app.route(home);

    const response = await app.handle({
      method: "GET",
      url: "https://example.test/",
      headers: {
        accept: "text/markdown"
      }
    });

    expect(response.status).toBe(200);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("supports richer schema builders for action input contracts", async () => {
    const app = createApp({
      appId: "starter",
      actionProof: { disabled: true }
    });
    const home = app.page("/", {
      markdown: "# Starter\n\n::: block{id=\"main\" actions=\"query_weather\"}\n:::",
      actions: [
        actions.read("query_weather", {
          label: "Query Weather",
          target: "/weather",
          transport: { method: "GET" },
          input: {
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
          }
        })
      ],
      render() {
        return {
          main: "- ready"
        };
      }
    });
    app.route(home);

    const response = await app.handle({
      method: "GET",
      url: "https://example.test/",
      headers: {
        accept: "text/markdown"
      },
      cookies: {}
    });

    expect(response.status).toBe(200);
    const executable = extractExecutable(String(response.body));
    const action = executable.actions?.find((item) => item.id === "query_weather");
    expect(action).toMatchObject({
      transport: { method: "GET" },
      input_schema: {
        type: "object",
        required: ["location", "range", "filters"],
        properties: {
          location: { type: "string", minLength: 1 },
          range: { type: "string", enum: ["current", "today", "3d"] },
          date: { type: "string", format: "date" },
          updated_at: { type: "string", format: "date-time" },
          thresholds: {
            type: "array",
            minItems: 1,
            items: { type: "number", minimum: 0, maximum: 100 }
          },
          filters: {
            type: "object",
            required: ["locale"],
            additionalProperties: false,
            properties: {
              locale: { type: "string", pattern: "^[a-z]{2}(-[A-Z]{2})?$" },
              includeWind: { type: "boolean" }
            }
          }
        }
      }
    });
  });

  it("can infer action input types from field maps", async () => {
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
      markdown: "# Typed\n\n::: block{id=\"main\"}\n:::",
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

  it("lets app API configure markdown rendering for browser shell html", async () => {
    const app = createApp({
      appId: "starter",
      actionProof: {
        disabled: true
      },
      browserShell: {
        title: "Starter"
      },
      rendering: {
        markdown: {
          render(markdown, context) {
            if (context?.kind === "page") {
              return `<article data-kind="page" data-route="${context.route ?? ""}">${markdown}</article>`;
            }
            return `<aside data-kind="block" data-block="${context?.blockName ?? ""}">${markdown}</aside>`;
          }
        }
      }
    });

    const home = app.page("/", {
      markdown: "# Starter\n\n::: block{id=\"main\"}\n:::",
      render() {
        return {
          main: "- Booted"
        };
      }
    });
    app.route(home);

    const response = await app.handle({
      method: "GET",
      url: "https://example.test/",
      headers: {
        accept: "text/html"
      },
      cookies: {}
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/html");
    const body = String(response.body);
    expect(body).toContain('<article data-kind="page" data-route="/"># Starter');
    expect(body).toContain('<aside data-kind="block" data-block="main">- Booted</aside>');
  });

  it("can bind handlers directly from page action declarations", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const app = createApp({
      appId: "starter",
      actionProof: { disabled: true }
    });
    const values: string[] = [];
    const page = app.page("/bind", {
      markdown: "# Bind\n\n::: block{id=\"main\" actions=\"lookup\"}\n:::",
      actions: [
        actions.read("lookup", {
          label: "Lookup",
          target: "/lookup",
          transport: { method: "GET" },
          input: {
            name: fields.string({ required: true })
          }
        })
      ],
      render(content: string) {
        return {
          main: content
        };
      }
    });
    app.route(page.bind("ready"));
    app.bindActions(page, {
      lookup: ({ inputs }) => {
        const upper = inputs.name.toUpperCase();
        values.push(upper);
        return page.bind(`name=${upper}`).render();
      }
    });

    const response = await app.handle({
      method: "GET",
      url: "https://example.test/lookup?name=Beijing",
      headers: {
        accept: "text/markdown"
      }
    });

    expect(response.status).toBe(200);
    expect(values).toEqual(["BEIJING"]);
    expect(String(response.body)).toContain("name=BEIJING");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("warns for missing or unknown handlers when using app.bindActions", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const app = createApp({
      appId: "starter",
      actionProof: { disabled: true }
    });
    const page = app.page("/bind", {
      markdown: "# Bind\n\n::: block{id=\"main\" actions=\"lookup\"}\n:::",
      actions: [
        actions.read("lookup", {
          label: "Lookup",
          target: "/lookup"
        })
      ],
      render(content: string) {
        return {
          main: content
        };
      }
    });

    app.bindActions(
      page,
      {
        unknown: async () => page.bind("x").render()
      } as unknown as Record<string, never>
    );

    expect(warnSpy).toHaveBeenCalledWith('[mdan-sdk] app.bindActions received unknown action id "unknown".');
    expect(warnSpy).toHaveBeenCalledWith('[mdan-sdk] app.bindActions missing handler for declared action "lookup".');
  });

  it("throws when bindActions cannot disambiguate same route+method actions", () => {
    const app = createApp({
      appId: "starter",
      actionProof: { disabled: true }
    });
    const page = app.page("/bind", {
      markdown: "# Bind\n\n::: block{id=\"main\" actions=\"a,b\"}\n:::",
      actions: [
        actions.write("a", {
          label: "A",
          target: "/same"
        }),
        actions.write("b", {
          label: "B",
          target: "/same"
        })
      ],
      render(content: string) {
        return { main: content };
      }
    });

    expect(() => app.bindActions(page, {})).toThrow(
      '[mdan-sdk] app.bindActions cannot disambiguate actions "a", "b" for route "POST:/same". Use app.action(...) explicitly for this route.'
    );
  });
});
