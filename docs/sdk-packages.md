---
title: SDK Packages
description: Supported public package entry paths for `@mdanai/sdk`, including the default app API, host adapters, and custom frontend runtime.
---

# SDK Packages

Use this page when your question is:

- which package should I import from
- which package is the normal path
- which package is advanced
- which paths are internal and should not be imported

This page is about package boundaries, not detailed API signatures.

If you already know which package you need and want the exported symbols, go to
[API Reference](/api-reference).

## Choose By Task

- I am building pages and actions:
  use `@mdanai/sdk`
- I need to host the app in Node:
  use `@mdanai/sdk/server/node`
- I need to host the app in Bun:
  use `@mdanai/sdk/server/bun`
- I need my own browser UI:
  use `@mdanai/sdk/surface`
- I intentionally need lower-level runtime control:
  use `@mdanai/sdk/server`

## The Short Version

For most app development:

- `@mdanai/sdk`
  default app-authoring entry
- `@mdanai/sdk/server/node`
  Node host entry
- `@mdanai/sdk/server/bun`
  Bun host entry

Only reach for these intentionally:

- `@mdanai/sdk/surface`
  custom frontend/runtime ownership
- `@mdanai/sdk/server`
  lower-level runtime control

## Supported Public Paths

```text
@mdanai/sdk
@mdanai/sdk/server
@mdanai/sdk/server/node
@mdanai/sdk/server/bun
@mdanai/sdk/surface
```

Anything outside these paths is not a stable public API.

## Which Package To Choose

## `@mdanai/sdk`

Use this when you are building pages and actions with the default MDAN app API.

This is the normal starting point for most developers.

## `@mdanai/sdk/server/node` and `@mdanai/sdk/server/bun`

Use these when you need to host the app in Node or Bun.

These are the normal host adapters for application code.

## `@mdanai/sdk/surface`

Use this when you want to keep MDAN browser/runtime behavior but fully own the
browser UI.

This is the custom-frontend path.

## `@mdanai/sdk/server`

Use this only when you intentionally need the lower-level runtime API.

This is not the normal first choice for app authoring.

## Practical Decision Rule

If you are unsure, follow this order:

1. start with `@mdanai/sdk`
2. add `@mdanai/sdk/server/node` or `@mdanai/sdk/server/bun` when you host the app
3. add `@mdanai/sdk/surface` only when you need a custom frontend
4. drop to `@mdanai/sdk/server` only when the higher-level app path is no longer enough

## What Each Public Package Owns

## Root app authoring: `@mdanai/sdk`

This package owns:

- `createApp(...)`
- explicit page manifests passed through `app.page(..., { actionJson })`
- `fields.*(...)`
- page registration and app-level action registration
- app-level helpers such as request helpers and session helpers

Use this when you want to define pages and actions without dropping into lower
runtime layers.

## Host adapters: `@mdanai/sdk/server/node` and `@mdanai/sdk/server/bun`

These packages own HTTP runtime concerns such as:

- body reading and normalization
- cookies
- browser shell serving
- static file and mount handling
- bridging browser forms into runtime requests

## Lower-level runtime: `@mdanai/sdk/server`

This package owns the reusable server runtime:

- `createMdanServer(...)`
- lower-level page/action runtime registration
- result helpers such as `ok(...)`, `fail(...)`, and `stream(...)`
- session mutation intents
- asset cleanup helpers

## Browser continuation: `@mdanai/sdk/surface`

This package owns browser-side continuation behavior:

- transport
- current route state
- action submission
- region patching
- browser history integration

## What Is Not Public

Do not import internal implementation paths such as:

- `@mdanai/sdk/src/...`
- `@mdanai/sdk/dist/...`
- `@mdanai/sdk/core`
- `@mdanai/sdk/protocol`
- deep files under `@mdanai/sdk/server/...`
- `dist-browser/...` as a Node import path

The shipped default browser UI is also internal. It is not a supported public
package entry.

## Practical Rule

Use this rule unless you have a clear reason not to:

- start with `@mdanai/sdk`
- host with `@mdanai/sdk/server/node` or `@mdanai/sdk/server/bun`
- add `@mdanai/sdk/surface` only when you need a custom frontend
- reach for `@mdanai/sdk/server` only when you intentionally want lower-level runtime control

## Related Docs

- [Custom Server](/custom-server)
- [API Reference](/api-reference)
- [Server Behavior](/server-behavior)
- [Browser Behavior](/browser-behavior)
