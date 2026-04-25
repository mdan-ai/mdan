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

From `@mdanai/sdk/frontend` you can pass a custom Markdown renderer through a
frontend extension:

- `defineFrontend(...)`
- `mountMdanUi(...)`
- `renderSurfaceSnapshot(...)`

That means you can keep MDAN route state, action submission, proof handling,
and region updates while changing only Markdown projection.

## Basic Shape

```ts
import { defineFrontend, type MdanMarkdownRenderer } from "@mdanai/sdk/frontend";

export const weatherMarkdownRenderer: MdanMarkdownRenderer = {
  render(markdown, context) {
    const scope = context.kind === "page" ? "page" : `block:${context.blockName}`;
    return `<section data-render-scope="${scope}">${markdown}</section>`;
  }
};

export const weatherFrontend = defineFrontend({
  markdown: weatherMarkdownRenderer
});
```

You then pass that frontend extension into shipped frontend rendering code:

- `renderSurfaceSnapshot(view, { frontend: weatherFrontend })`
- `mountMdanUi({ root, host, frontend: weatherFrontend })`

## Browser Entry Flow

With the shipped browser entry:

1. the browser opens the natural route such as `/login`
2. the frontend entry fetches the matching raw markdown route such as `/login.md`
3. the shipped frontend renders that Markdown through your frontend extension

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
