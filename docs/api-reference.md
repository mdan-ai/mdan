---
title: API Reference
description: TypeScript API reference for the public `@mdanai/sdk` package paths, including the core layer, server runtime, host adapters, and frontend helpers.
---

# API Reference

## Start Here

Most developers start with:

- `createApp(...)` from `@mdanai/sdk/app`
- `createHost(...)` from `@mdanai/sdk/server/node` or `@mdanai/sdk/server/bun`
- `createHeadlessHost(...)` from `@mdanai/sdk/surface` when building a custom frontend

## Entry Points

- `@mdanai/sdk`
- `@mdanai/sdk/app`
- `@mdanai/sdk/core`
- `@mdanai/sdk/frontend`
- `@mdanai/sdk/server`
- `@mdanai/sdk/server/node`
- `@mdanai/sdk/server/bun`
- `@mdanai/sdk/surface`

## `@mdanai/sdk`

Reserved root entrypoint. It does not publish the app/server API surface anymore.

## `@mdanai/sdk/core`

The shared protocol and markdown-content layer.

### Main Exports

- `MDAN_PAGE_MANIFEST_VERSION`
- `type MdanActionManifest`
- `type JsonAction`
- `type JsonBlock`
- `parseReadableSurface(...)`
- `serializePage(...)`
- `serializeFragment(...)`

## `@mdanai/sdk/app`

The app authoring layer.

### Most Developers Use

- `createApp(options?)`
- `type AppActionJsonManifest`
- `fields`
- `signIn(session)`
- `signOut()`
- `refreshSession(session)`
- `type MdanSessionProvider`
- `type MdanSessionSnapshot`

### App Authoring Helpers

- `app.page(path, { markdown, actionJson, render })`
- `page.bind(...)`
- `page.render(...)`
- `app.route(...)`
- `app.action(...)`
- `app.read(...)`
- `app.write(...)`
- `page.actionJson()`

## `@mdanai/sdk/frontend`

The shipped frontend helpers.

### Main Exports

- `createFrontend(...)`
- `defineFrontend(...)`
- `mountMdanUi(...)`
- `renderSurfaceSnapshot(...)`
- `bootEntry(...)`
- `resolveEntryRoute(...)`
- `resolveMarkdownRoute(...)`
- `type MdanMarkdownRenderer`
- `type MdanFrontendExtension`
- `registerMdanUi()`
- `defineFormRenderer(moduleUrl, exportName, renderer)`
- `defaultUiFormRenderer`
- `html`
- `nothing`
- `type UiFormRenderer`
- `type FrontendSnapshot`
- `type FrontendUiHost`
- `type FrontendHostFactory`

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

## `@mdanai/sdk/server/node`

- `createHost(server, options?)`
- `createNodeHost(server, options?)`
- `createNodeRequestListener(server, options?)`

## `@mdanai/sdk/server/bun`

- `createHost(server, options?)`

## `@mdanai/sdk/surface`

The headless browser runtime for custom frontends.

### Most Developers Use

- `createHeadlessHost(options?)`
- `type HeadlessSnapshot`
- `type MdanHeadlessUiHost`

The returned host provides:

- `mount()`
- `unmount()`
- `subscribe(listener)`
- `getSnapshot()`
- `visit(target)`
- `sync(target?)`
- `submit(operation, values)`

`@mdanai/sdk/surface` is the runtime implementation layer. If you are typing a
frontend integration, prefer the runtime contracts exported from
`@mdanai/sdk/frontend` unless you specifically need the concrete headless host
types.

## Related Docs

- [SDK Packages](/sdk-packages)
- [Custom Server](/custom-server)
- [Markdown Rendering](/markdown-rendering)
- [Action JSON](/action-json)
- [Server Behavior](/server-behavior)
- [Browser Behavior](/browser-behavior)
