---
title: Elements
description: @mdsnai/sdk/elements provides the official default UI.
---

# Elements

`@mdsnai/sdk/elements` provides the official default UI for MDSN, built on Web Components.

It now sits directly on top of the browser runtime state instead of only styling raw server-rendered HTML.

If you do not want to build your own UI, this is the most direct browser-side option.

The main path is `mountMdsnElements({ root, host, ... })`. `registerMdsnElements()` is a lower-level primitive that is mostly useful in tests or special integrations.

## Basic Usage

```ts
import { mountMdsnElements } from "@mdsnai/sdk/elements";
import { createHeadlessHost } from "@mdsnai/sdk/web";
```

```ts
const host = createHeadlessHost({ root: document, fetchImpl: window.fetch });
mountMdsnElements({
  root: document,
  host
}).mount();
```

If you want a third-party Markdown renderer, inject the same renderer here:

```ts
mountMdsnElements({
  root: document,
  host,
  markdownRenderer: {
    render(markdown) {
      return marked.parse(markdown);
    }
  }
}).mount();
```

If you only want to register the custom elements, you can still call `registerMdsnElements()` on its own.

By default it registers:

- `mdsn-page`
- `mdsn-block`
- `mdsn-form`
- `mdsn-field`
- `mdsn-action`
- `mdsn-error`

## When This Package Fits

- you want a ready-to-use default UI
- you want framework-neutral Web Components
- you want a thin official view layer on top of the same browser runtime

If you only want the browser runtime and plan to render everything yourself, use `@mdsnai/sdk/web` without `@mdsnai/sdk/elements`.
