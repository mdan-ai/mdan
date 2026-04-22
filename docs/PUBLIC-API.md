# Public API And Package Boundaries

This document describes the supported package entry paths for `@mdanai/sdk`.
Use these paths instead of importing internal files from `dist/` or `src/`.

## Export Paths

The package exposes these public paths:

```text
@mdanai/sdk
@mdanai/sdk/server
@mdanai/sdk/server/node
@mdanai/sdk/server/bun
@mdanai/sdk/surface
```

Anything outside these paths is not a stable public API.

## Public Boundary

External consumers should build against `@mdanai/sdk` for app authoring,
`@mdanai/sdk/surface` for custom browser-side work, plus the runtime-specific
`@mdanai/sdk/server/node` and `@mdanai/sdk/server/bun` host adapters. Reach for
`@mdanai/sdk/server` only when you intentionally need the lower-level runtime
API.

Protocol, surface, content, and other lower-level modules are internal
implementation boundaries and are not part of the supported package surface.

## Root App API

Use `@mdanai/sdk` as the default application authoring surface:

```ts
import { actions, createApp, fields } from "@mdanai/sdk";
```

The root package includes:

- `createApp()`
- `actions.read()`, `actions.write()`, `actions.navigate()`
- `fields.string()`, `fields.number()`, `fields.boolean()`
- `AppBrowserShellOptions`
- `CreateAppOptions`
- app-level markdown rendering types
- `signIn()` and `signOut()` session helpers

This is the preferred entry for defining app pages and actions without exposing
protocol or runtime internals in your application code.

## Server

Use `@mdanai/sdk/server` for runtime modeling:

```ts
import {
  createMdanServer,
  ok,
  fail,
  stream,
  signIn,
  signOut
} from "@mdanai/sdk/server";
```

Server includes:

- `createMdanServer()`
- handler types and request/response types
- result helpers
- session mutation helpers
- `cleanupExpiredAssets(...)`

The server package is runtime logic. It does not by itself bind to Node or Bun
HTTP servers.

The main barrel intentionally keeps only the most common request/response and
session-provider types. Lower-level handler, input, and result typing details
stay behind `src/server/types.ts` as internal implementation structure unless
they are promoted later.

Browser-shell implementation helpers remain internal server-layer details rather
than part of the main `@mdanai/sdk/server` barrel.
Body-normalization helpers also stay behind the host-adapter layer instead of
shipping as part of the main server barrel.
Standalone asset-store read/write helpers also stay off the main server barrel.
Standalone asset-store config/result typing also stays off the main server
barrel.
Artifact assembly helpers also stay off the main server barrel.
Browser-shell and auto-dependency tuning types are likewise kept off the main
server barrel.
Post-input validation helpers and their detailed type graph stay internal to the
runtime layer as well.

## Server Host Adapters

Use `@mdanai/sdk/server/node` for Node HTTP integration:

```ts
import { createHost } from "@mdanai/sdk/server/node";
```

Use `@mdanai/sdk/server/bun` for Bun:

```ts
import { createHost } from "@mdanai/sdk/server/bun";
```

Host adapters own HTTP runtime details such as body reading, cookies, static
files, browser shell serving, and form bridging. See `SERVER-ADAPTERS.md`.

## Surface

Use `@mdanai/sdk/surface` for custom browser frontends:

```ts
import { createHeadlessHost } from "@mdanai/sdk/surface";
```

The surface runtime owns:

- transport
- current route/snapshot state
- action submission
- region patching
- browser history integration

## Default UI

The default Web Components UI implementation remains inside the SDK for browser
shell rendering and browser bundle assembly, but it is no longer a supported
public package entry.

New integrations should prefer either:

- `@mdanai/sdk` with the browser shell
- `@mdanai/sdk` plus `@mdanai/sdk/surface` for custom UI ownership

## Browser Re-Export Files

The source tree contains browser re-export files used when building browser
bundles. They are implementation details for package build output and host
serving.

Do not import `src/browser/*` or corresponding `dist/browser/*` files from
application code.

## Dist Browser Artifacts

`dist-browser/` contains bundled browser modules served by the host in
`browserShell.moduleMode: "local-dist"`:

```text
/__mdan/browser-shell.js
/__mdan/surface.js
/__mdan/ui.js
```

These artifacts are served to browsers by the host adapter. They are not
general Node import paths and are not a replacement for `@mdanai/sdk/surface`.

## Internal Modules

Internal files under `src/` or `dist/` may change without a package-level
compatibility guarantee.

Examples of non-stable import targets:

- `@mdanai/sdk/dist/...`
- `@mdanai/sdk/src/...`
- `@mdanai/sdk/core`
- deep files under `@mdanai/sdk/core/...`
- deep files under `@mdanai/sdk/server/...`
- `@mdanai/sdk/protocol`
- `dist-browser/...` as a Node import

If a helper is needed by applications, promote it to one of the documented
export paths before relying on it.

## Boundary Rules

The SDK keeps these boundaries stable:

- `@mdanai/sdk` is the app-authoring surface for most developers.
- `@mdanai/sdk/surface` is independent from ui, Lit, and Markdown rendering UI.
- `@mdanai/sdk/server` is runtime modeling, not a Node/Bun host adapter.
- `@mdanai/sdk/server/node` and `@mdanai/sdk/server/bun` are host integration
  layers.
- protocol, surface, content, and other lower-level modules remain internal.

These boundaries keep agent clients, custom frontends, browser hosts, and server
apps from accidentally depending on the wrong layer.
