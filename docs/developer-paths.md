---
title: Developer Paths
description: Choose how to build an MDAN agent app, skills app, or custom-frontend app with `@mdanai/sdk` as the default path and `@mdanai/sdk/surface` as the frontend escape hatch.
---

# Developer Paths

Use this page to quickly pick the right MDAN integration path for your
situation.

If you already know you want to build an agent app or skills app with the SDK,
this page is the shortest way to choose between the default app path, a custom
frontend path, or a lower-level backend integration path.

## Path A: App + Browser Shell

Use:

- `@mdanai/sdk`
- `@mdanai/sdk/server/node` or `@mdanai/sdk/server/bun`
- `browserShell` host configuration

This is the best path when you want the fastest route to a readable browser app
with server-rendered HTML.

See:

- [Getting Started](/getting-started)
- [Application Structure](/application-structure)
- [Browser And Headless Runtime](/guides/browser-and-headless-runtime)

## Path B: App + Surface + Your Own UI

Use:

- `@mdanai/sdk`
- `@mdanai/sdk/server/node` or `@mdanai/sdk/server/bun`
- `@mdanai/sdk/surface`
- your own React, Vue, or other rendering layer

This is the best path when you want your own design system while keeping MDAN
runtime behavior.

See:

- [Custom Rendering](/custom-rendering)
- [Examples](/examples)

## Path C: App + Agent/Artifact Delivery

Use:

- `@mdanai/sdk`
- `@mdanai/sdk/server/node` or `@mdanai/sdk/server/bun`

This is the best path when you want to serve Markdown artifacts to agents,
tests, or another client without owning a custom browser frontend.

See:

- [Runtime Contract](/guides/runtime-contract)
- [Server Adapters](/reference/server-adapters)

## Path D: Advanced Runtime Integration

Use:

- `@mdanai/sdk/server`
- `createMdanServer()`
- your framework's HTTP layer
- a thin adapter around the host/runtime boundary

This is the best path when you already have an Express, Fastify, Koa, Hono, or
custom backend and need controlled low-level integration beyond the root app
API.

See:

- [Server Integration](/server-integration)
- [Server Adapters](/reference/server-adapters)

## Decision Checklist

- need the fastest launch with server-rendered browser output: choose Path A
- need a custom visual system with the same MDAN behavior: choose Path B
- need artifact-first responses with minimal browser concerns: choose Path C
- need deep backend integration: choose Path D

## Practical Rule

For new work, default to:

- `@mdanai/sdk` for app authoring
- `@mdanai/sdk/surface` only when you need a custom frontend

Treat `@mdanai/sdk/server` as a lower-level integration layer rather than the
main starting point.

## Anti-Pattern To Avoid

Do not duplicate MDAN routing, action semantics, or request-shape logic inside
frontend framework code or backend middleware layers. Keep that behavior in the
app/runtime and surface layers, then let your UI render from current state.
