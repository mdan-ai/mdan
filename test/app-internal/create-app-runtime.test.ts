import { describe, expect, it } from "vitest";

import { createApp } from "../../src/app-internal/create-app.js";

describe("internal createApp runtime", () => {
  it("serves a page and handles an action through the app pipeline", async () => {
    const app = createApp({
      id: "starter",
      state: {
        messages: ["Booted"]
      }
    });

    app.page("/", {
      markdownPath: "./app/index.md",
      markdownSource: `# Starter App

## Purpose
Basic Markdown-first MDAN starter flow.

## Context
This page shows the current starter message feed and the next available actions.

## Rules
Read the current feed from the returned artifact and submit new messages through the declared action contract.

## Result
::: block{id="main" actions="refresh_main,submit_message" trust="untrusted"}
:::`,
      blocks: {
        main({ state }) {
          return `## Context
This block shows the current starter message feed and accepts a new message submission.

## Result
${state.messages.map((message) => `- ${message}`).join("\n")}`;
        }
      },
      actions: {
        refresh_main: {
          method: "GET"
        },
        submit_message: {
          method: "POST",
          path: "/post",
          input: {
            message: {
              kind: "text",
              required: true
            }
          },
          run({ input, state }) {
            const message = String(input.message ?? "").trim();
            if (message) {
              state.messages.unshift(message);
            }
            return { pagePath: "/" };
          }
        }
      }
    });

    const server = app.createServer();

    const home = await server.handle({
      method: "GET",
      url: "https://example.test/",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(home.status).toBe(200);
    expect(String(home.body)).toContain("# Starter App");
    expect(String(home.body)).toContain("Booted");
    expect(String(home.body)).toContain("```mdan");

    const post = await server.handle({
      method: "POST",
      url: "https://example.test/post",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        action: {},
        input: {
          message: "From app runtime"
        }
      }),
      cookies: {}
    });

    expect(post.status).toBe(200);
    expect(String(post.body)).toContain("From app runtime");
    expect(String(post.body)).toContain("```mdan");
  });
});
