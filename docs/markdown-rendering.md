---
title: Markdown Rendering
description: Customize shipped frontend markdown rendering with `@mdanai/sdk/frontend` while keeping MDAN transport and surface behavior unchanged.
---

# Markdown Rendering

Use this page when you want to keep the shipped frontend behavior but replace
how Markdown is turned into HTML.

This is a frontend concern now.

The server still only returns `text/markdown`. The frontend entry, shipped UI,
and custom frontend integrations decide how to render that Markdown.

## What This Package Gives You

From `@mdanai/sdk/frontend` you can create a frontend object that carries your
custom Markdown renderer:

- `createFrontend(...)`
- `frontend.mount(...)`
- `frontend.render(...)`

That means you can keep MDAN route state, action submission, proof handling,
and region updates while changing only Markdown projection.

## Basic Shape

```ts
import { createFrontend, defineFrontendModule, type MdanMarkdownRenderer } from "@mdanai/sdk/frontend";

export const weatherMarkdownRenderer: MdanMarkdownRenderer = {
  render(markdown, context) {
    const scope = context.kind === "page" ? "page" : `block:${context.blockName}`;
    return `<section data-render-scope="${scope}">${markdown}</section>`;
  }
};

export const weatherFrontend = defineFrontendModule(
  import.meta.url,
  createFrontend({
    markdown: weatherMarkdownRenderer
  })
);
```

You then use that object as the shipped frontend entry:

- `weatherFrontend.render(view)`
- `weatherFrontend.mount({ root, host })`
- `weatherFrontend.boot(...)`

## Client Projection Flow

With client projection:

1. the browser opens the natural route such as `/login`
2. the frontend entry fetches the matching raw markdown route such as `/login.md`
3. the shipped frontend renders that Markdown through your `frontend.markdown`

With HTML projection, the server renders readable Markdown for browser
documents and the frontend only enhances actions. Use a frontend Markdown
renderer when you intentionally choose client projection or a fully custom
frontend.

The Markdown renderer does not change transport. It only changes projection.

## Practical Rule

- keep the renderer focused on Markdown-to-HTML projection
- do not invent a second route or action model
- let MDAN keep transport, proof handling, and route updates
- let the frontend own presentation

## Related Docs

- [Choose A Rendering Path](/choose-a-rendering-path)
- [Form Rendering](/form-rendering)
- [Custom Rendering](/custom-rendering)
- [Browser Behavior](/browser-behavior)
- [API Reference](/api-reference)
