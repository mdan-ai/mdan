import { describe, expect, it } from "vitest";

import { actions, createApp, fields } from "../src/index.js";
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
    expect(body).toContain('<article data-kind="page" data-route="/"># Starter</article>');
    expect(body).toContain('<aside data-kind="block" data-block="main">- Booted</aside>');
  });
});
