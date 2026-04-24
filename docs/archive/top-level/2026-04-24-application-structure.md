---
title: Application Structure
description: Recommended app architecture, project structure, routing model, and responsibility boundaries for real MDAN agent apps and skills apps.
---

# Application Structure

This page is about how to lay out code, content, and interaction when you build
a real MDAN app.

Use it as the reference page for MDAN app architecture: how to split Markdown
content, action contracts, server logic, and browser delivery without losing
the shared application surface model.

The short version is: keep content, server logic, and browser behavior
separate, but do not split them into something heavier than the app itself.

For most application code, prefer the root app API (`createApp`, `page`,
`route`, `read/write`, `bindActions`) and only drop to `createMdanServer()`
when you intentionally need lower-level runtime control.

## Recommended Shape

There are two common shapes in the current repository:

### Scaffolded App Shape

The generated `create-mdan` starter usually looks like this:

- `app/index.md` for the main page content
- `app/actions/*.json` for action declarations
- `app/server.mjs` for runtime state and handlers
- `index.mjs` for the Node or Bun host entry

### Repository Example Shape

Several in-repo examples use a slightly different workspace-oriented layout:

- `app/*.md` for page content
- `app/actions/*.json` for action declarations where examples keep them separate
- `app.ts` or server-side composition code for runtime state and handlers
- `dev.ts` or runtime host entry for local serving

The exact file names differ, but the responsibilities stay the
same:

- content files define the readable surface shape
- server code attaches runtime state and action handlers
- the host entry serves the app in Node or Bun

## Keep Responsibilities Clear

A clean split usually looks like this:

- Markdown defines readable content and block structure
- executable action metadata stays explicit
- `createApp()` defines pages and action contracts for normal app authoring
- `createMdanServer()` is the lower-level runtime path when needed
- `createHost()` from the Node or Bun adapter hosts that runtime
- `createHeadlessHost()` handles follow-up browser interaction when you need a custom UI

That keeps page, runtime, and browser concerns from collapsing into one layer.

## How Pages And Actions Line Up

MDAN uses explicit page routes and explicit action paths.

In practice:

- `server.page(path, handler)` defines a page read route
- `server.get(path, handler)` or `server.post(path, handler)` defines an action route
- returned action contracts tell clients what can happen next

That keeps the relation between pages and interaction stable. You do not need
to infer bindings from whatever the page happens to render today.

## Where HTML Shell Logic Belongs

Shared browser-shell concerns should usually stay in host-level configuration:

- browser shell title and module mode
- static files and mounts
- HTML transforms if needed

The Markdown response remains the app surface. The HTML shell wraps it for
browser delivery.

## How To Organize Actions

Each action should stay explicit about:

- method
- target
- label and verb
- input shape
- expected state effect

The common cases are:

- page reads that return a full surface
- local refresh or read actions
- write actions that return the next surface or updated region state

If all you need is to refresh current state, keep the result focused. If a write
needs to return the next allowed action context, keep that in the returned
surface rather than scattering it into parallel response channels.

## Recommended Build Order

1. Decide your route list and page content files.
2. Write the readable surface shape first.
3. Register page routes and action routes in the server runtime.
4. Choose your host adapter for Node or Bun.
5. Add browser continuation only if your app needs it.

## Common Pitfalls

- mixing domain state updates into UI code instead of handlers
- hiding action behavior in frontend assumptions instead of declared contracts
- coupling docs/examples too tightly to internal file names
- treating compatibility JSON as the primary design path for new code

## Related Docs

- [Developer Paths](/developer-paths)
- [Server Integration](/server-integration)
- [Custom Rendering](/custom-rendering)
