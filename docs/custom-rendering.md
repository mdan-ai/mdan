---
title: Custom Rendering
description: Keep the MDAN browser runtime while letting React, Vue, or another UI layer render interactive pages your own way.
---

# Custom Rendering

If you want to keep the MDAN browser runtime while letting your own framework
fully own the UI, this is the path to take.

## Shared Principle

- `@mdanai/sdk/surface` handles request lifecycle, route state, action
  submission, and update semantics
- your framework handles the component tree, rendering, form controls, and
  local visual state

In other words: keep the MDAN behavior layer, replace the view layer.

## Lifecycle Pattern

Whether you use Vue, React, or another framework, the recommended pattern is
the same:

1. create the host once during mount/setup
2. subscribe to current state immediately after creation
3. call `host.mount()`
4. unsubscribe and `host.unmount()` during teardown

That avoids duplicate subscriptions, stale runtime instances, and memory leaks.

## Core Host Shape

```ts
import { createHeadlessHost } from "@mdanai/sdk/surface";

const host = createHeadlessHost({
  initialRoute: window.location.pathname + window.location.search,
  fetchImpl: window.fetch
});

host.mount();

const unsubscribe = host.subscribe((snapshot) => {
  console.log(snapshot.route, snapshot.status);
});
```

## Debugging Custom UIs

If you want to inspect raw protocol traffic while building a custom UI, enable
browser-side debug messages on the host:

```ts
const host = createHeadlessHost({
  initialRoute: window.location.pathname + window.location.search,
  debugMessages: true
});
```

That keeps a browser-visible log of raw request/response messages at
`window.__MDAN_DEBUG__.messages`.

## Forms And Actions

Your rendering layer should derive UI from current runtime state plus local form
state, not from a duplicated set of server assumptions.

Practical rules:

- submit only values declared by the current operation
- let `GET` actions map to query-driven reads
- let `POST` actions submit declared input values
- react to returned page or region updates instead of predicting them locally

## When To Choose This Path

Choose custom rendering when:

- you want MDAN transport and state handling
- but you need your own React, Vue, or other component system
- and the default `@mdanai/sdk/ui` package is not the right presentation layer

If you want the fastest path to a working browser app, stay with the default UI
instead.

## Related Docs

- [Browser And Headless Runtime](/guides/browser-and-headless-runtime)
- [Public API](/reference/public-api)
- [Examples](/examples)
