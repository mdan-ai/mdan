---
title: Config Reference
description: Core configuration surfaces for MDSN runtime integration.
---

# Config Reference

## `createHostedApp(options)`

Key options:

- `pages`
- `actions`
- `markdownRenderer`
- `renderHtml`

## `createNodeHost(server, options)`

Key options:

- `rootRedirect`
- `ignoreFavicon`
- `transformHtml`
- `staticFiles`
- `staticMounts`

## `createHeadlessHost(options)`

Key options:

- `root`
- `fetchImpl`

## `mountMdsnElements(options)`

Key options:

- `root`
- `host`
- `markdownRenderer`

For exact signatures, see [API Reference](/docs/api-reference).

## Production Defaults (Suggested)

- `createNodeHost({ rootRedirect })`: always set root redirect explicitly.
- `ignoreFavicon`: keep default unless your infra needs custom handling.
- `staticMounts`: prefer explicit URL prefix, avoid broad mounts.
- `fetchImpl`: in browser use `window.fetch` directly.

## Example Mapping

- Host options in use: [examples/starter/dev.mjs](/Users/hencoo/projects/mdsn/examples/starter/dev.mjs)
- Adapter options in use: [examples/express-starter/src/express-adapter.ts](/Users/hencoo/projects/mdsn/examples/express-starter/src/express-adapter.ts)
