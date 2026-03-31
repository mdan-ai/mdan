---
title: Application Structure
description: Recommended project structure, routing model, and action organization for real MDSN apps and docs sites.
---

# Application Structure

This page is about how to lay out code, pages, and interaction when you build a real MDSN app.

The short version is: keep page source, server logic, and browser-side code separate, but do not split them into something heavier than the app itself.

## Recommended Shape

The smallest useful structure is usually:

- `app/*.md`: page source
- `app/server.ts`: page composition and action handlers
- `app/client.ts`: browser runtime and UI mounting
- `index.mjs`: local Node host entry

You can think of that as three layers:

- `app/*.md` defines page content and operations
- `app/server.ts` connects pages to real application state
- `app/client.ts` handles follow-up interaction in the browser

`index.mjs` only hosts the app so you can run it locally or deploy it in a Node environment.

## Keep Responsibilities Clear

The easiest way to make an MDSN app hard to maintain is to mix responsibilities.

A clean split usually looks like this:

- Markdown defines content and operations
- `composePage()` attaches runtime block content to the page
- `createHostedApp({ pages, actions })` registers pages and operations as an app
- `createNodeHost()` hosts that app in Node
- `createHeadlessHost()` handles follow-up interaction in the browser

That way, the page layer, the server layer, and the browser layer each do one thing.

## How Pages and Operations Line Up

MDSN uses explicit page routes and explicit action paths.

- page route: `pages["/docs"] = () => composedPage`
- action path: each action declares `target + methods + routePath + blockName`

That keeps the relation between pages and interaction stable. You do not need to infer bindings from whatever the page happens to look like right now.

In practice:

- `routePath` says which page an operation belongs to
- `blockName` says which part of the page it primarily updates
- `target` says which HTTP path the request actually hits

When those three line up, behavior tends to stay predictable.

## Where HTML Shell Logic Belongs

Shared HTML shell logic should usually live in server-side wrapping:

- use `renderHtml` to build the global shell
- or use `transformHtml` in the Node host entry for final injection

Typical responsibilities look like this:

- Markdown: content and interaction
- `renderHtml`: headers, navigation, theme, and other global shell concerns
- browser runtime: follow-up page and block updates

So the Markdown page is the application itself, while the HTML shell wraps it into a fuller website or page experience.

## How To Organize Operations

Each action should explicitly declare:

- `target`
- `methods`
- `routePath`
- `blockName`
- `handler`

The two most common cases are:

### Read Action (GET)

```ts
handler: ({ block }) => block()
```

### Write Action (POST)

```ts
handler: ({ inputs, block }) => {
  // update domain state
  return block();
}
```

If all you need is to refresh the current block, return `block()`.

If a write also needs to carry new state, an error, or the next available operation, keep that with the returned fragment instead of scattering it elsewhere.

## Recommended Build Order

1. Decide your route list and page files.
2. Write the Markdown for each page, then build a `renderPage()`-style composition function.
3. Register each page operation as an explicit action.
4. Wire up the Node entry, static assets, and HTML shell.
5. Add the browser runtime and verify local updates and page transitions.

## Common Pitfalls

- treating the example shell import map as public SDK API
- returning a full page when a block fragment is enough
- putting domain state updates into the UI layer instead of action handlers
- changing operation definitions in the page without updating `target`, `routePath`, and `blockName` on the server side

## Related Docs

- [Server Integration](/docs/server-integration)
- [Custom Rendering](/docs/custom-rendering)
- [Session Provider](/docs/session-provider)
