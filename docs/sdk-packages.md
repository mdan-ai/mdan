---
title: SDK Packages
description: Supported public package entry paths for `@mdanai/sdk`, including the core app/server runtime, frontend helpers, and headless surface runtime.
---

# SDK Packages

## Choose By Task

- getting started with app authoring and shipped frontend helpers:
  `@mdanai/sdk`
- building a [Web Skill](/web-skills) with a URL-addressable Markdown surface:
  `@mdanai/sdk`
- building pages and actions with an explicit authoring-only import:
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
  convenience root entrypoint for app authoring and shipped frontend helpers
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

- start with `@mdanai/sdk`
- reach for `@mdanai/sdk/app` when you want the app authoring API without the
  root convenience barrel
- reach for `@mdanai/sdk/core` only when you intentionally want the shared
  protocol/content layer
- host with `app.host("node" | "bun", options?)` on the app-facing path
- reach for `@mdanai/sdk/server/node` or `@mdanai/sdk/server/bun` when you
  intentionally want the lower-level host adapters
- reach for `@mdanai/sdk/frontend` when you want the shipped frontend helpers
  without the root convenience barrel
- add `@mdanai/sdk/surface` when you want your own browser UI

## Related Docs

- [Architecture](/architecture)
- [API Reference](/api-reference)
- [Custom Server](/custom-server)
- [Web Skills](/web-skills)
- [Browser Behavior](/browser-behavior)
