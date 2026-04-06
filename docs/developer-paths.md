---
title: Developer Paths
description: Choose the MDAN integration path that best fits your app, whether you need a hosted app, custom UI, existing backend integration, or spec utilities only.
---

# Developer Paths

Use this page to quickly pick the right MDAN integration path for your situation.

## Path A: Hosted App + Default UI

Use:

- `@mdanai/sdk/server`
- `@mdanai/sdk/web`
- `@mdanai/sdk/elements`

This is the best path when you want a working product quickly with the official UI.

See:

- [Getting Started](/docs/getting-started)
- [Application Structure](/docs/application-structure)
- [Elements](/docs/elements)

## Path B: Hosted App + Custom UI

Use:

- `@mdanai/sdk/server`
- `@mdanai/sdk/web`
- your own UI framework

This is the best path when you want your own design system while keeping MDAN runtime behavior.

See:

- [Custom Rendering](/docs/custom-rendering)
- [Examples](/docs/examples)

## Path C: Existing Backend Integration

Use:

- `createMdanServer()` or `createHostedApp()`
- your own framework adapter around `server.handle()`

This is the best path when you already have an Express, Hono, or Next backend and need controlled integration.

See:

- [Server Integration](/docs/server-integration)
- [Server Runtime](/docs/server-runtime)

## Path D: Protocol Utilities Only

Use:

- `@mdanai/sdk/core`

This is the best path when you only need parse, validate, and serialize utilities.

See:

- [SDK Overview](/docs/sdk)
- [API Reference](/docs/api-reference)

## Decision Checklist

- Need the fastest launch with the official UI: choose Path A
- Need a custom visual system with the same MDAN behavior: choose Path B
- Need deep backend integration: choose Path C
- Need parser and serializer utilities only: choose Path D

## Anti-Pattern To Avoid

Do not duplicate MDAN logic inside frontend framework code. Keep spec handling and routing behavior in the server and runtime layers, then let the UI render from current state.
