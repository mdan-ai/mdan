---
title: SDK Overview
description: Package structure, protocol boundaries, and recommended usage in the MDSN SDK.
---

# SDK Overview

`@mdsnai/sdk` is the official SDK for MDSN.

This page answers three questions:

- which packages exist in the SDK
- what each package is responsible for
- where to start reading

If you only remember one thing, remember this:

- `core` handles MDSN pages and Markdown
- `server` turns pages and operations into a runnable server-side app
- `web` handles follow-up interaction in the browser
- `elements` provides the default UI

## Package Structure

The current release model is **one package with subpath exports**.

- `@mdsnai/sdk/core`
- `@mdsnai/sdk/server`
- `@mdsnai/sdk/web`
- `@mdsnai/sdk/elements`

You can also import from the root `@mdsnai/sdk` entry.

Import guidance:

- prefer subpath imports to keep boundaries clear, such as `@mdsnai/sdk/server`
- only use the root entry when you explicitly want one import surface
- do not depend on deep internal paths such as `dist/*`

## What Each Package Does

- `core`
  parses pages, validates pages, handles Markdown request bodies, and serializes results
- `server`
  handles page routes, action registration, content negotiation, and server hosting
- `web`
  handles browser-side requests, local updates, and state synchronization
- `elements`
  provides the official default UI on top of `web`

## Protocol Boundary

The protocol boundary is always Markdown:

- page routes return full page Markdown
- `BLOCK` operations return the current block's Markdown fragment by default
- browsers receive HTML first, then the runtime takes over further updates

Agents consume Markdown directly. Browsers consume HTML produced from the same app.

## Where To Start Reading

If this is your first time using the SDK, the recommended path is:

- want to get an app running first: [Getting Started](/docs/getting-started)
- want to understand project layout: [Application Structure](/docs/application-structure)
- want to understand server-side capabilities: [Server Runtime](/docs/server-runtime)
- want to understand browser-side capabilities: [Web Runtime](/docs/web-runtime)
- want to look up specific APIs: [API Reference](/docs/api-reference)

## Public Entry Points

The current release line is one package with subpath exports. Older multi-package names are not part of the public surface.

The supported public entries are:

- `@mdsnai/sdk`
- `@mdsnai/sdk/core`
- `@mdsnai/sdk/server`
- `@mdsnai/sdk/web`
- `@mdsnai/sdk/elements`
