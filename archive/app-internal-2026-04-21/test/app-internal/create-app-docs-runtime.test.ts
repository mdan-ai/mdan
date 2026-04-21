import { describe, expect, it } from "vitest";

import { createApp } from "../../src/app-internal/create-app.js";

describe("internal createApp docs runtime", () => {
  it("serves a docs-style page with a GET refresh action", async () => {
    const app = createApp({
      id: "docs-starter",
      state: {}
    });

    app.page("/", {
      markdownPath: "./app/index.md",
      markdownSource: `# Docs Starter

## Purpose
Simple docs home page.

## Context
This page introduces the docs example and renders the current documentation region from the surface.

## Rules
Read the docs region from the current surface and use the declared docs action when refreshing content.

## Result
::: block{id="docs" actions="refresh_docs" trust="untrusted"}
:::`,
      blocks: {
        docs() {
          return `# Getting Started

## Context
This docs region explains how to change the docs-starter example and verify the returned artifact.

## Result
After editing this file and refreshing the page, you should see the updated docs region in both Markdown and HTML projections.`;
        }
      },
      actions: {
        refresh_docs: {
          method: "GET",
          path: "/"
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
    expect(String(home.body)).toContain("# Docs Starter");
    expect(String(home.body)).toContain("# Getting Started");
    expect(String(home.body)).toContain("```mdan");
    expect(String(home.body)).toContain('"refresh_docs"');
    expect(String(home.body)).toContain('"action_proof"');
  });
});
