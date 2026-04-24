---
title: API Reference
description: TypeScript API reference for the public `@mdanai/sdk` packages, including the app API, host adapters, surface runtime, and lower-level server runtime.
---

# API Reference

Use this page when your question is:

- what does this package export
- which functions do I actually call
- what are the main public entrypoints in each package

This page is the TypeScript API reference for the public SDK surface.

If your question is "which package should I choose at all?", start with
[SDK Packages](/sdk-packages).

## Start Here

If you only need the most common entrypoints, start with these:

- `createApp(...)` from `@mdanai/sdk`
- `createHost(...)` from `@mdanai/sdk/server/node` or `@mdanai/sdk/server/bun`
- `createHeadlessHost(...)` from `@mdanai/sdk/surface` when you build a custom frontend
- `createMdanServer(...)` from `@mdanai/sdk/server` only for lower-level runtime control

## Entry Points

The main public package entries are:

- `@mdanai/sdk`
- `@mdanai/sdk/server/node`
- `@mdanai/sdk/server/bun`
- `@mdanai/sdk/surface`
- `@mdanai/sdk/server`

## `@mdanai/sdk`

The default app-authoring entrypoint.

### Most Developers Use

- `createApp(options?)`
- `type AppActionJsonManifest`
- `fields`
- `getHeader()`, `getCookie()`, `getQueryParam()`
- `signIn()`
- `signOut()`

### Types You May Notice

- `AppBrowserShellOptions`
- `CreateAppOptions`
- `UiFormRenderer`
- `MdanActionManifest`
- `MDAN_PAGE_MANIFEST_VERSION`

### App Authoring Helpers

- `app.page(path, { markdown, actionJson, render })`
- `app.page(...)`
- `page.bind(...)`
- `page.render(...)`
- `app.route(...)`
- `app.action(...)`
- `app.read(...)`
- `app.write(...)`
- `page.actionJson()`

### Runtime Rules You Will Care About

- page authoring now expects an explicit `actionJson` manifest instead of
  inline action builder helpers
- `route` and `read` are both GET-capable, but they are not interchangeable
- the same GET path cannot be owned by both `app.route(...)` and `app.read(...)`
- current action transport support is `GET` and `POST`

## `@mdanai/sdk/server`

The lower-level server runtime.

### Main Exports

- `createMdanServer(options?)`
- `ok(result)`
- `fail(result)`
- `stream(chunks, result?)`
- `signIn(session)`
- `signOut()`
- `refreshSession(session)`
- `cleanupExpiredAssets(options)`

Use this package intentionally, not as the default app-authoring path.

## `@mdanai/sdk/server/node`

The Node HTTP integration layer.

### Main Exports

- `createHost(server, options?)`
- `createNodeHost(server, options?)`
- `createNodeRequestListener(server, options?)`

Use `createHost()` for the normal Node path.

`createNodeHost()` is the Node-specific alias behind `createHost()`.

## `@mdanai/sdk/server/bun`

The Bun host integration layer.

### Main Export

- `createHost(server, options?)`

Use it as the `fetch` handler for `Bun.serve(...)`.

## `@mdanai/sdk/surface`

The headless browser runtime for custom frontends.

### Most Developers Use

- `createHeadlessHost(options?)`

The returned host provides:

- `mount()`
- `unmount()`
- `subscribe(listener)`
- `getSnapshot()`
- `visit(target)`
- `sync(target?)`
- `submit(operation, values)`

### Other Public Surface Exports

This package also re-exports protocol and adapter helpers used by more advanced
custom frontend work.

If you only need the main browser runtime path, `createHeadlessHost()` is the
entrypoint to care about first.

## What This Page Does Not Cover

This page does not try to explain runtime behavior, browser continuation, or
package-boundary rules in depth.

Use:

- [SDK Packages](/sdk-packages) for package choice and stability boundaries
- [Custom Server](/custom-server) for host integration guidance
- [Server Behavior](/server-behavior) for runtime behavior
- [Browser Behavior](/browser-behavior) for browser continuation behavior

## Related Docs

- [SDK Packages](/sdk-packages)
- [Custom Server](/custom-server)
- [Action JSON](/action-json)
- [Server Behavior](/server-behavior)
- [Browser Behavior](/browser-behavior)
