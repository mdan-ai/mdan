---
title: Custom Rendering
description: Keep the MDSN browser runtime and let Vue or React take over the UI.
---

# Custom Rendering

If you want to keep the MDSN browser runtime while letting your own framework fully own the UI, this is the path to take.

## Shared Principle

- `@mdsnai/sdk/web` handles request lifecycle, state updates, and protocol behavior
- your framework handles the component tree, rendering, form controls, and visual state

In other words: keep the protocol layer, replace the view layer.

## Lifecycle Pattern

Whether you use Vue or React, the recommended pattern is the same:

1. create the host once in the component mount lifecycle
2. subscribe to current state immediately after creation
3. call `host.mount()`
4. unsubscribe and `host.unmount()` during teardown

That avoids duplicate subscriptions, stale runtime instances, and memory leaks.

If you want to inspect raw protocol traffic while building a custom UI, you can also enable browser-side debug messages on the host:

```ts
const host = createHeadlessHost({
  root: document,
  debugMessages: true
});
```

That keeps a browser-visible log of raw Markdown send/receive messages at `window.__MDSN_DEBUG__.messages`.

## Forms and Operations

- `GET` operations send an empty payload
- `POST` operations only submit the inputs declared by the operation
- clear the relevant fields after a successful submission

UI should be derived from current runtime state plus local form state, not from a duplicated set of server assumptions.

## Vue Example

Reference: [examples/vue-starter/app/client.ts](/Users/hencoo/projects/mdsn/examples/vue-starter/app/client.ts)

This is the right path if you want Vue to own the component tree and visual system while keeping MDSN behavior underneath.

## React Example

Reference: [examples/react-starter/app/client.tsx](/Users/hencoo/projects/mdsn/examples/react-starter/app/client.tsx)

This is the right path if you want React to own state projection and interaction components while keeping the same MDSN runtime.

## Using a Third-Party Markdown Renderer

If you do not want to use the built-in Markdown rendering behavior, you can also bring a third-party renderer into this path.

Common choices include:

- `marked`
- `markdown-it`
- `remark`

There are two example shapes for this in the repository:

- [examples/vue-starter/app/client.ts](/Users/hencoo/projects/mdsn/examples/vue-starter/app/client.ts)
  uses `marked` directly in the Vue client
- [examples/react-starter/app/client.tsx](/Users/hencoo/projects/mdsn/examples/react-starter/app/client.tsx)
  uses `marked` directly in the React client

If you want the server output and the default UI to share the same rendering rules as well, see:

- [examples/marked-starter/app/server.ts](/Users/hencoo/projects/mdsn/examples/marked-starter/app/server.ts)
- [examples/marked-starter/app/client.ts](/Users/hencoo/projects/mdsn/examples/marked-starter/app/client.ts)

In that setup, the same renderer is typically injected into:

- `@mdsnai/sdk/server`
- `@mdsnai/sdk/elements`

That keeps the server-rendered HTML and the default UI aligned.

## Common Pitfalls

- recreating the host on every render
- forgetting to `unmount` during teardown
- mutating runtime state objects directly
- submitting form state captured from stale closures

## Related Docs

- [Web Runtime](/docs/web-runtime)
- [Examples](/docs/examples)
- [Third-Party Renderer](/docs/third-party-markdown-renderer)
