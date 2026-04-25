---
title: SDK Packages
description: Supported public package entry paths for `@mdanai/sdk`, including the core app/server runtime, frontend helpers, and headless surface runtime.
---

# SDK Packages

## Choose By Task

- building pages and actions:
  `@mdanai/sdk/app`
- hosting in Node:
  `@mdanai/sdk/server/node`
- hosting in Bun:
  `@mdanai/sdk/server/bun`
- using the shipped frontend helpers:
  `@mdanai/sdk/frontend`
- building your own frontend:
  `@mdanai/sdk/surface`
- consuming the shared protocol/content core directly:
  `@mdanai/sdk/core`
- intentionally dropping to the low-level runtime:
  `@mdanai/sdk/server`

## Supported Public Paths

```text
@mdanai/sdk
@mdanai/sdk/app
@mdanai/sdk/core
@mdanai/sdk/frontend
@mdanai/sdk/server
@mdanai/sdk/server/node
@mdanai/sdk/server/bun
@mdanai/sdk/surface
```

Anything outside these paths is not a stable public API.

## Ownership Split

- `@mdanai/sdk`
  reserved root entrypoint
- `@mdanai/sdk/app`
  app authoring helpers such as `createApp`, `fields`, and page/action wiring
- `@mdanai/sdk/core`
  shared protocol, markdown-content parsing, and executable-surface helpers
- `@mdanai/sdk/server*`
  markdown-only server runtime and host adapters
- `@mdanai/sdk/frontend`
  shipped frontend helpers such as `mountMdanUi`, `renderSurfaceSnapshot`, and
  `defineFormRenderer`, plus the frontend runtime contracts
- `@mdanai/sdk/surface`
  headless browser runtime implementation for custom frontends

## Practical Rule

- start with `@mdanai/sdk/app`
- reach for `@mdanai/sdk/core` only when you intentionally want the shared
  protocol/content layer
- host with `@mdanai/sdk/server/node` or `@mdanai/sdk/server/bun`
- add `@mdanai/sdk/frontend` when you want the shipped frontend helpers
- add `@mdanai/sdk/surface` when you want your own browser UI

## Related Docs

- [Architecture](/architecture)
- [API Reference](/api-reference)
- [Custom Server](/custom-server)
- [Browser Behavior](/browser-behavior)
