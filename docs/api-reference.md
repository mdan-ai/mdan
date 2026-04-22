---
title: API Reference
description: MDAN SDK API reference for the current `@mdanai/sdk` package, including the supported page, route, action, and runtime entry paths.
---

# API Reference

This document covers the public MDAN SDK surface you should actually depend on.

Use it when you need the stable API for building MDAN apps with pages, routes,
actions, browser delivery, or lower-level runtime integration.

If something does not appear here or in [Public API](/reference/public-api), do
not rely on it as a stable interface.

## Supported Entry Paths

The supported public package entries are:

- `@mdanai/sdk`
- `@mdanai/sdk/server/node`
- `@mdanai/sdk/server/bun`
- `@mdanai/sdk/surface`
- `@mdanai/sdk/server`

Treat the first three as the normal app-development path. Treat `surface`,
and `server` as progressively lower-level or more specialized entries.

For boundary rules, see [Public API](/reference/public-api).

## `@mdanai/sdk`

The default app-authoring entrypoint.

### Main Exports

- `createApp(options?)`
- `actions`
- `fields`
- `AppBrowserShellOptions`
- `CreateAppOptions`
- `signIn()`
- `signOut()`

### App Types

The root package exports the app-level browser-shell and markdown-rendering
types that shape `createApp(...)`, without exposing the broader internal
authoring/runtime type graph.

Use this entry when you want the shortest path to shipping an app without
directly modeling protocol/runtime internals.

## `@mdanai/sdk/server`

The shared lower-level server runtime and server-side helpers.

Reach for this package intentionally, not as the default app-authoring path.

### Core Runtime

- `createMdanServer(options?)`
  Creates the server runtime and lets you register:
  - `server.page(path, handler)`
  - `server.get(path, handler)`
  - `server.post(path, handler)`

### Result Helpers

- `ok(result)`
- `fail(result)`
- `stream(chunks, result?)`

Use these helpers when you want explicit success, failure, or streaming action
results.

### Session Helpers

- `signIn(session)`
- `signOut()`
- `refreshSession(session)`

These create session mutation intents for the configured session provider.

### Asset Helpers

- `cleanupExpiredAssets(options)`

### Common Exported Types

The server package also exports only the common request, response, session, and
asset-handle types used by applications and tests.

The browser-shell implementation helpers are intentionally not part of this main
barrel.
The host-level body-normalization helpers are also intentionally kept off this
main barrel.
Standalone asset-store read/write helpers are also intentionally kept off this
main barrel.
Runtime-tuning types such as browser-shell or auto-dependency config details
are intentionally kept off this main barrel as well.
Post-input validation helpers and their detailed types are also kept off this
main barrel.
Artifact assembly helpers are also intentionally kept off this main barrel.
Lower-level handler, input, and stream/result typing details are also kept off
this main barrel.

## `@mdanai/sdk/server/node`

The Node HTTP integration layer.

### Main Exports

- `createHost(server, options?)`
- `createNodeHost(server, options?)`
- `createNodeRequestListener(server, options?)`

Use `createHost()` for the usual Node entry path. Reach for
`createNodeRequestListener()` only when you need a lower-level `http` listener.

## `@mdanai/sdk/server/bun`

The Bun host integration layer.

### Main Export

- `createHost(server, options?)`

Use it as the `fetch` entry for `Bun.serve(...)`.

## `@mdanai/sdk/surface`

The lightweight browser/headless runtime for custom frontends.

### Main Export

- `createHeadlessHost(options?)`

The returned host provides the main browser-continuation methods:

- `mount()`
- `unmount()`
- `subscribe(listener)`
- `getSnapshot()`
- `visit(target)`
- `sync(target?)`
- `submit(operation, values)`

The surface package also exports protocol and adapter-layer types used by
custom frontends.

## Default UI Implementation

The shipped Web Components UI remains an internal SDK implementation detail used
by the browser shell and browser bundles. Application code should not import it
as a public package entry.

## Legacy And Internal Paths To Avoid

Do not depend on:

- deep `src/` imports
- deep `dist/` imports
- old package names such as `@mdanai/sdk/web` or `@mdanai/sdk/elements`
- undocumented internal modules under `protocol`, `content`, or server internals

## Related Docs

- [Public API](/reference/public-api)
- [Runtime Contract](/guides/runtime-contract)
- [Browser And Headless Runtime](/guides/browser-and-headless-runtime)
