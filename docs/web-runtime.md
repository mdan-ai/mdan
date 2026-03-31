---
title: Web Runtime
description: The browser-side runtime model in @mdsnai/sdk/web.
---

# Web Runtime

`@mdsnai/sdk/web` is the browser-side runtime. It does not render your UI.

It reads the initial state written into HTML by the server, sends requests, maintains page and block state, and exposes that state to any rendering layer.

If you want one sentence to remember, use this: `web` is responsible for how interaction continues. Whether you draw the UI yourself is a separate question.

## Basic Usage

```ts
import { createHeadlessHost } from "@mdsnai/sdk/web";

const host = createHeadlessHost({ root: document, fetchImpl: window.fetch });
host.mount();

host.subscribe((snapshot) => {
  console.log(snapshot.route, snapshot.blocks);
});
```

This is the recommended browser-side path:

- default UI: `createHeadlessHost()` + `mountMdsnElements()`
- framework UI: `createHeadlessHost()` + Vue, React, or Svelte rendering

When a framework owns the UI, the recommended interface is:

- `host.getSnapshot()`
- `host.subscribe(listener)`
- `host.submit(operation, values)`
- `host.visit(target)`

## What It Actually Does

After mounting, the runtime will:

- read the initial state from the current HTML document
- send `GET` and `POST` actions with the correct protocol behavior
- merge returned block fragments into current state
- load new page state when a response points at a new page target
- notify any rendering layer through `subscribe(listener)`

In other words, it is responsible for the interaction process itself, not the visual presentation.

## Runtime State

The runtime exposes a small state API:

```ts
host.subscribe((snapshot) => {
  console.log(snapshot.status);
});
```

Current states are:

- `idle`
- `loading`
- `error`

## Relationship to `elements`

- if you want the official default UI, combine `createHeadlessHost()` with `mountMdsnElements()`
- if you want Vue, React, or another framework to own the UI, keep only `createHeadlessHost()`

You can think of it as: `web` runs the interaction, `elements` displays it.
