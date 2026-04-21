---
title: Application Structure
description: Recommended project structure, routing model, and responsibility boundaries for real MDAN apps.
---

# Application Structure

This page is about how to lay out code, content, and interaction when you build
a real MDAN app.

The short version is: keep content, server logic, and browser behavior
separate, but do not split them into something heavier than the app itself.

## Recommended Shape

For the current examples and scaffolded apps, the useful minimum usually looks
like this:

- `app/*.md` for page content
- `app/actions/*.json` for action declarations where examples keep them separate
- `app.ts` or server-side composition code for runtime state and handlers
- `dev.ts` or runtime host entry for local serving

The exact file names may differ by example, but the responsibilities stay the
same:

- content files define the readable artifact shape
- server code attaches runtime state and action handlers
- the host entry serves the app in Node or Bun

## Keep Responsibilities Clear

A clean split usually looks like this:

- Markdown defines readable content and block structure
- executable action metadata stays explicit
- `createMdanServer()` registers page routes and action routes
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

The Markdown artifact remains the app surface. The HTML shell wraps it for
browser delivery.

## How To Organize Actions

Each action should stay explicit about:

- method
- target
- label and verb
- input shape
- expected state effect

The common cases are:

- page reads that return a full artifact
- local refresh or read actions
- write actions that return the next artifact or updated region state

If all you need is to refresh current state, keep the result focused. If a write
needs to return the next allowed action context, keep that in the returned
artifact rather than scattering it into parallel response channels.

## Recommended Build Order

1. Decide your route list and page content files.
2. Write the readable artifact shape first.
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
