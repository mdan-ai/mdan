---
title: API Reference
description: TypeScript API reference for the public `@mdanai/sdk` package paths, including the core layer, server runtime, host adapters, and frontend helpers.
---

# API Reference

## Start Here

Most developers start with:

- `createApp(...)` and `createFrontend(...)` from `@mdanai/sdk`
- `app.host("node" | "bun", options?)` from the app instance
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

The convenience root entrypoint for the most common app and shipped frontend
authoring helpers.

### Main Exports

- `createApp(options?)`
- `fields`
- `type InferAppInputs`
- `signIn(session)`
- `signOut()`
- `refreshSession(session)`
- `createFrontend(options?)`
- `defineFrontendModule(moduleUrl, frontend, exportName?)`
- `defineFormRenderer(moduleUrl, exportName, renderer)`
- `defaultUiFormRenderer`
- `html`
- `nothing`

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

The app authoring layer. Use this subpath when you want the app API without the
root convenience barrel.

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
- `app.host("node", options?)`
- `app.host("bun", options?)`
- `page.actionJson()`

### App Options

- `auto.resolveRequest(context)`
- `auto.fallbackToStaticTarget`
- `browser.bootstrap(context)`

Use `browser.bootstrap(...)` for first browser entry initialization. Use
`auto.resolveRequest(...)` only when a normal auto GET dependency needs a
runtime-computed internal request.

## `@mdanai/sdk/frontend`

The shipped frontend helpers. Use this subpath when you want the frontend API
without the root convenience barrel.

### Main Exports

- `createFrontend(...)`
- `defineFrontendModule(moduleUrl, frontend, exportName?)`
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

`bootEntry(...)` automatically attaches an internal SDK-owned browser bootstrap
intent to its first browser-driven read. App code does not configure that
signal directly.

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

### Server Options

- `auto.maxPasses`
- `auto.resolveRequest(context)`
- `auto.fallbackToStaticTarget`
- `browserBootstrap(context)`

`browserBootstrap(...)` runs only for SDK-marked first browser entry reads. It
stays separate from general auto dependency execution.

## `@mdanai/sdk/server/node`

- `createHost(server, options?)`
- `createNodeHost(server, options?)`
- `createNodeRequestListener(server, options?)`

Most apps now use:

```ts
createHost(server, {
  frontend: true
});
```

If you want a custom browser frontend module instead of the built-in browser
entry, use:

```ts
createHost(server, {
  frontend: {
    module: "/abs/path/to/frontend.js"
  }
});
```

If you already have a frontend object and want to pass it directly, give it a
browser-recoverable module identity first:

```ts
const frontend = defineFrontendModule(
  import.meta.url,
  createFrontend({
    form: weatherFormRenderer
  })
);

app.host("bun", {
  frontend
});
```

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
- [Browser Bootstrap](/browser-bootstrap)
