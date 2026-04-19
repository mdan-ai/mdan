# Public API And Package Boundaries

This document describes the supported package entry paths for `@mdanai/sdk`.
Use these paths instead of importing internal files from `dist/` or `src/`.

## Export Paths

The package exposes these public paths:

```text
@mdanai/sdk/server
@mdanai/sdk/server/node
@mdanai/sdk/server/bun
@mdanai/sdk/surface
@mdanai/sdk/ui
```

Anything outside these paths is not a stable public API.

## Public Boundary

External consumers should only build against `@mdanai/sdk/server`,
`@mdanai/sdk/surface`, and `@mdanai/sdk/ui` plus the runtime-specific
`@mdanai/sdk/server/node` and `@mdanai/sdk/server/bun` host adapters.

Protocol, surface, content, and other lower-level modules are internal
implementation boundaries and are not part of the supported package surface.

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
- asset store helpers
- browser shell helpers used by host adapters
- body normalization helpers used by adapters and tests

The server package is runtime logic. It does not by itself bind to Node or Bun
HTTP servers.

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

## UI

Use `@mdanai/sdk/ui` for the default Web Components UI:

```ts
import { mountMdanUi, registerMdanUi } from "@mdanai/sdk/ui";
```

UI is the optional default UI layer. It is not required for the MDAN
protocol, server runtime, or custom frontends.

Because ui depends on browser custom elements and Lit, do not import it
from protocol-only code, server-only code, or headless tests unless the default
UI is the subject of the test.

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
/__mdan/surface.js
/__mdan/ui.js
```

These artifacts are served to browsers by the host adapter. They are not
general Node import paths and are not a replacement for `@mdanai/sdk/surface` or
`@mdanai/sdk/ui`.

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

- `@mdanai/sdk/surface` is independent from ui, Lit, and Markdown rendering UI.
- `@mdanai/sdk/ui` is optional default UI, not protocol infrastructure.
- `@mdanai/sdk/server` is runtime modeling, not a Node/Bun host adapter.
- `@mdanai/sdk/server/node` and `@mdanai/sdk/server/bun` are host integration
  layers.
- protocol, surface, content, and other lower-level modules remain internal.

These boundaries keep agent clients, custom frontends, browser hosts, and server
apps from accidentally depending on the wrong layer.
