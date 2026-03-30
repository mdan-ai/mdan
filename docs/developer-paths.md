---
title: Developer Paths
description: Choose the right MDSN integration path for your product.
---

# Developer Paths

Use this page to pick the fastest path for your use case.

## Path A: Hosted App + Default UI

Use:

- `@mdsnai/sdk/server`
- `@mdsnai/sdk/web`
- `@mdsnai/sdk/elements`

Best when you want a working product quickly with the official UI.

See:

- [Getting Started](/docs/getting-started)
- [Elements](/docs/elements)

## Path B: Hosted App + Custom UI (Vue/React)

Use:

- `@mdsnai/sdk/server`
- `@mdsnai/sdk/web`
- your framework renderer

Best when you want your own design system while keeping MDSN runtime behavior.

See:

- [Custom Rendering with Vue](/docs/vue-rendering)
- [Custom Rendering with React](/docs/react-rendering)

## Path C: Server-First Integration in Existing Backend

Use:

- `createMdsnServer()` / `createHostedApp()`
- your own framework adapter around `server.handle()`

Best when you already have an Express/Hono/Next backend and need controlled integration.

See:

- [Server Development](/docs/server-development)
- [Server Runtime](/docs/server-runtime)

## Path D: Protocol Utilities Only

Use:

- `@mdsnai/sdk/core`

Best when you only need parse/validate/serialize utilities.

See:

- [SDK Overview](/docs/sdk)
- [API Reference](/docs/api-reference)

## Decision Checklist

Use this quick checklist:

- Need fastest launch with official UI: choose Path A.
- Need custom visual system but same protocol: choose Path B.
- Need deep backend integration: choose Path C.
- Need parser/serializer utilities only: choose Path D.

## Anti-Pattern to Avoid

Do not duplicate protocol logic in frontend framework code. Keep protocol and routing rules in server/runtime layers, then map UI to snapshot state.
