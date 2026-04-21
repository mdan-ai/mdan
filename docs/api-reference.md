---
title: API Reference
description: Public API reference for the current @mdanai/sdk package and its supported subpath exports.
---

# API Reference

This document covers the public SDK surface you should actually depend on.

If something does not appear here or in [Public API](/reference/public-api), do
not rely on it as a stable interface.

## Supported Entry Paths

The supported public package entries are:

- `@mdanai/sdk/server`
- `@mdanai/sdk/server/node`
- `@mdanai/sdk/server/bun`
- `@mdanai/sdk/surface`
- `@mdanai/sdk/ui`

The root package also re-exports a small convenience surface:

- `createMdanServer`
- `createArtifactPage`
- `createArtifactFragment`
- `createExecutableContent`
- `createHeadlessHost`
- `mountMdanUi`

For boundary rules, see [Public API](/reference/public-api).

## `@mdanai/sdk/server`

The shared server runtime and server-side helpers.

### Core Runtime

- `createMdanServer(options?)`
  Creates the server runtime and lets you register:
  - `server.page(path, handler)`
  - `server.get(path, handler)`
  - `server.post(path, handler)`

### Artifact Helpers

- `createArtifactPage(options)`
- `createArtifactFragment(options)`
- `createExecutableContent(value)`

Use these when you want to build artifact-native results directly instead of
hand-writing embedded executable content strings.

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
- `createLocalAssetHandle(...)`
- `getAssetHandle(...)`
- `readAsset(...)`
- `openAssetStream(...)`

### Request/Input Helpers

- `validatePostInputs(inputs, policy)`
- `normalizeMultipartBody(...)`
- `normalizeUrlEncodedBody(...)`

### Common Exported Types

The server package also exports the main request, response, handler, session,
stream, and asset-related types used by applications and tests.

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

## `@mdanai/sdk/ui`

The optional default Web Components UI layer.

### Main Exports

- `mountMdanUi(options)`
- `registerMdanUi()`

Use `mountMdanUi()` for the default browser UI path. Use `registerMdanUi()`
directly only when you need manual custom-element registration or test control.

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
