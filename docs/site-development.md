---
title: Framework Development
description: Build an MDSN site with a hosted-app style architecture.
---

# Framework Development

This page documents the recommended site-development baseline in the current SDK.

## Recommended Composition

- Canonical page sources in Markdown files
- Page composition in server module (`composePage`)
- Explicit action registration (`createHostedApp`)
- Node hosting via `createNodeHost`
- Browser runtime via `createHeadlessHost`

## Why This Shape

- Keeps protocol logic in one place
- Avoids coupling app state to UI framework internals
- Supports both default UI and custom UI with the same server contract

## Minimal Structure

- `app/*.md` (canonical sources)
- `app/server.ts` (page/action composition)
- `app/client.ts` (headless/UI mount)
- `index.mjs` (runtime shell)

## Related Docs

- [Routing and Layouts](/docs/routing-layouts)
- [Config Reference](/docs/config-reference)
- [Action Reference](/docs/action-reference)

## Recommended Build Sequence

1. Lock route list and canonical page files.
2. Implement `renderPage()` composition functions per route.
3. Implement action list with explicit `target + routePath + blockName`.
4. Wire Node host and static mounts.
5. Add browser runtime mount and verify block updates.

## Common Pitfalls

- Treating demo shell import map as SDK public API.
- Returning full page for every action when block fragment is enough.
- Mixing business state mutation into UI layer instead of action handlers.
