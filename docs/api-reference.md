---
title: API Reference
description: Public API overview for the current @mdanai/sdk package.
---

# API Reference

This document only covers APIs that are actually part of the current public SDK surface.

If something does not appear here, you should not rely on it as a public SDK interface.

This page is for looking up entry points and API names. It is not meant to explain the whole model or best practices.

## `@mdanai/sdk/core`

This group contains the spec-facing and Markdown handling tools.

### `parsePage(source)`

Parses a `.md` page source and returns a page object.

### `composePage(source, { blocks })`

Parses a page and attaches runtime block content, returning a composed page object.

The returned value also provides:

- `page.fragment(blockName)`

This is the recommended way to extract a block fragment from a composed page.

### `validatePage(page)`

Validates page structure, including:

- block names
- anchor alignment
- input references
- operation constraints

### `parseMarkdownBody(body)`

Parses the Markdown form of a `POST` request body.

### `serializeMarkdownBody(values)`

Serializes fields into a standard Markdown request body.

### `serializePage(page)`

Serializes a full page object into full page Markdown.

### `serializeFragment(fragment)`

Serializes a block-level fragment into Markdown.

### `MdanMarkdownRenderer`

The shared Markdown renderer extension point. The same renderer can be injected into:

- `createMdanServer({ markdownRenderer })`
- `createHostedApp({ markdownRenderer })`
- `mountMdanElements({ markdownRenderer })`

### `negotiateRepresentation(acceptHeader)`

Negotiates from `Accept`:

- `event-stream`
- `markdown`
- `html`
- `not-acceptable`

When `text/markdown` is explicitly present, it wins over `html`.

## `@mdanai/sdk/server`

This group contains the shared server runtime.

### `createHostedApp({ pages, actions, ...options })`

Creates a more compact Hosted App entry.

Each action must explicitly declare:

- `target`
- `methods`
- `routePath`
- `blockName`
- `handler`

Each action automatically receives:

- `routePath`
- `blockName`
- `page()`
- `block()`

### `createMdanServer(options?)`

Creates the server runtime.

Common options:

- `session`
- `renderHtml`
- `markdownRenderer`

Once created, you can register:

- `server.page(path, handler)`
- `server.get(path, handler)`
- `server.post(path, handler)`
- `server.handle(request)`

### `block(page, blockName, result?)`

Wraps a block from a composed page into a successful action result.

### `stream(asyncIterable, result?)`

Wraps an async fragment stream into a `text/event-stream` response.

### `ok(result)`

Builds a successful action result for cases where you want to handcraft the fragment.

### `fail(result)`

Builds a failed action result for cases where you want an explicit 4xx/5xx status and still return a Markdown fragment.

### `signIn(session)`

Creates a sign-in session mutation.

### `signOut()`

Creates a sign-out session mutation.

### `refreshSession(session)`

Creates a session refresh mutation.

## `@mdanai/sdk/server/node`

This group contains the Node host adapter.

### `createHost(server, options?)`

The recommended Node `http` entry point.

Supported options:

- `rootRedirect`
- `ignoreFavicon`
- `transformHtml`
- `staticFiles`
- `staticMounts`

### `createNodeHost(server, options?)`

An explicit Node-named alias for `createHost(...)`.

### `createNodeRequestListener(server, options?)`

Lower-level Node `RequestListener` adapter when you want to wrap your own `http.createServer(...)` shell.

## `@mdanai/sdk/server/bun`

This group contains the Bun host adapter.

### `createHost(server, options?)`

The recommended Bun `fetch` entry point for `Bun.serve(...)`.

Supported options:

- `rootRedirect`
- `ignoreFavicon`
- `transformHtml`
- `staticFiles`
- `staticMounts`
- `maxBodyBytes`

## `@mdanai/sdk/web`

This group contains the browser-side runtime.

### `createHeadlessHost({ root, fetchImpl })`

This is the recommended entry point for the browser runtime.

The returned host provides:

- `host.getSnapshot()`
- `host.subscribe(listener)`
- `host.submit(operation, values)`
- `host.visit(target)`
- `host.mount()`
- `host.unmount()`

## `@mdanai/sdk/elements`

This group contains the default UI layer and custom element registry.

### `mountMdanElements({ root, host, markdownRenderer? })`

The recommended default UI entry. It will:

- register the official Web Components
- render the default page, block, and form UI from current state

### `registerMdanElements()`

Registers these default Web Components:

- `mdan-page`
- `mdan-block`
- `mdan-form`
- `mdan-field`
- `mdan-action`
- `mdan-error`

## Legacy Paths You Should Avoid Depending On

These may still exist inside package internals, but they should not be treated as public SDK boundaries:

- `fragmentForBlock()` root export
- `createNodeRequestListener()` root export
- `renderHtmlDocument()` root export
- `@mdanai/sdk/elements/register` subpath
