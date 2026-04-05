---
title: Elements
description: @mdanai/sdk/elements provides the official default UI.
---

# Elements

`@mdanai/sdk/elements` provides the official default UI for MDAN, built on Web Components.

It now sits directly on top of the browser runtime state instead of only styling raw server-rendered HTML.

If you do not want to build your own UI, this is the most direct browser-side option.

The main path is `mountMdanElements({ root, host, ... })`. `registerMdanElements()` is a lower-level primitive that is mostly useful in tests or special integrations.

## Basic Usage

```ts
import { mountMdanElements } from "@mdanai/sdk/elements";
import { createHeadlessHost } from "@mdanai/sdk/web";
```

```ts
const host = createHeadlessHost({ root: document, fetchImpl: window.fetch });
mountMdanElements({
  root: document,
  host
}).mount();
```

If you want a third-party Markdown renderer, inject the same renderer here:

```ts
mountMdanElements({
  root: document,
  host,
  markdownRenderer: {
    render(markdown) {
      return marked.parse(markdown);
    }
  }
}).mount();
```

If you only want to register the custom elements, you can still call `registerMdanElements()` on its own.

By default it registers:

- `mdan-page`
- `mdan-block`
- `mdan-form`
- `mdan-field`
- `mdan-action`
- `mdan-error`

## When This Package Fits

- you want a ready-to-use default UI
- you want framework-neutral Web Components
- you want a thin official view layer on top of the same browser runtime

If you only want the browser runtime and plan to render everything yourself, use `@mdanai/sdk/web` without `@mdanai/sdk/elements`.
