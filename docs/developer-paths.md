---
title: Developer Paths
description: Choose the MDAN integration path that best fits your app, whether you want the default UI, a custom UI, or server-only artifact delivery.
---

# Developer Paths

Use this page to quickly pick the right MDAN integration path for your
situation.

## Path A: Server + Browser Shell

Use:

- `@mdanai/sdk/server`
- `@mdanai/sdk/server/node` or `@mdanai/sdk/server/bun`
- `browserShell` host configuration
- optional `@mdanai/sdk/ui` when you want to mount the default UI package in a
  custom client path

This is the best path when you want the fastest route to a readable browser app
with server-rendered HTML.

See:

- [Getting Started](/getting-started)
- [Application Structure](/application-structure)
- [Browser And Headless Runtime](/guides/browser-and-headless-runtime)

## Path B: Server + Surface + Your Own UI

Use:

- `@mdanai/sdk/server`
- `@mdanai/sdk/server/node` or `@mdanai/sdk/server/bun`
- `@mdanai/sdk/surface`
- your own React, Vue, or other rendering layer

This is the best path when you want your own design system while keeping MDAN
runtime behavior.

See:

- [Custom Rendering](/custom-rendering)
- [Examples](/examples)

## Path C: Server Only

Use:

- `@mdanai/sdk/server`
- `@mdanai/sdk/server/node` or `@mdanai/sdk/server/bun`

This is the best path when you want to serve Markdown artifacts to agents,
tests, or another client without shipping the bundled browser UI.

See:

- [Runtime Contract](/guides/runtime-contract)
- [Server Adapters](/reference/server-adapters)

## Path D: Existing Backend Integration

Use:

- `createMdanServer()`
- your framework's HTTP layer
- a thin adapter around the host/runtime boundary

This is the best path when you already have an Express, Fastify, Koa, Hono, or
custom backend and need controlled integration.

See:

- [Server Integration](/server-integration)
- [Server Adapters](/reference/server-adapters)

## Decision Checklist

- need the fastest launch with server-rendered browser output: choose Path A
- need a custom visual system with the same MDAN behavior: choose Path B
- need artifact-first responses with minimal browser concerns: choose Path C
- need deep backend integration: choose Path D

## Anti-Pattern To Avoid

Do not duplicate MDAN routing, action semantics, or request-shape logic inside
frontend framework code or backend middleware layers. Keep that behavior in the
server and surface layers, then let your UI render from current state.
