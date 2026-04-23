---
title: Architecture
description: Architectural overview of the MDAN SDK package surfaces, internal layers, runtime boundaries, and the Markdown-first app model.
---

# Architecture

This repository ships the reference MDAN SDK as a small set of public package
surfaces over a larger internal implementation tree.

## Public Package Surfaces

The intended public product surfaces are:

- `@mdanai/sdk`
- `@mdanai/sdk/surface`
- `@mdanai/sdk/server`
- `@mdanai/sdk/server/node`
- `@mdanai/sdk/server/bun`
- `@mdanai/sdk/ui`

For new work, the default path is:

1. author apps with `@mdanai/sdk`
2. host them with `@mdanai/sdk/server/node` or `@mdanai/sdk/server/bun`
3. only reach for `@mdanai/sdk/surface` when you need a custom frontend

`@mdanai/sdk/server` is the lower-level runtime layer, and `@mdanai/sdk/ui` is
the optional default UI implementation rather than a primary product entry.
They are both secondary to the root app API rather than peer primary surfaces.

Everything else under `src/` is internal implementation detail unless
explicitly promoted.

This repository also contains `docs-site/`, which is a repository tool for
rendering docs and specs. It is not part of the published SDK package surface.

## Architectural Model

The current system is Markdown-first.

- Markdown is the canonical readable app surface for reads
- HTML is a projection of that same surface for browser document requests
- Actions remain structured and executable
- Legacy JSON surfaces still exist as a compatibility bridge for older runtime paths and tests

At a high level, the flow is:

1. A host adapter accepts an HTTP request.
2. The server runtime normalizes the request, validates input and proof, and resolves the matching route.
3. The app/runtime layer returns a Markdown-native result or a legacy readable surface.
4. The runtime validates contracts, resolves auto dependencies, and negotiates the response representation.
5. The response is returned as Markdown, HTML, SSE, or a limited compatibility JSON shape.

For most applications, the app author only sees step 1 through `createApp(...)`
plus a runtime host adapter. The lower server runtime remains below that app
surface.

## Layer Map

### `src/server/`

Owns server-side runtime behavior.

Key responsibilities:

- route registration and dispatch via `createMdanServer()`
- request parsing and input normalization
- action proof issuing and verification
- session access and mutations
- asset storage helpers
- auto dependency resolution
- response normalization and representation negotiation
- browser shell HTML generation used by host adapters

This layer is the center of the lower-level runtime contract, not the preferred
entrypoint for normal app authoring.

### `src/protocol/`

Owns low-level protocol contracts and normalization helpers shared by the
runtime.

Key responsibilities:

- action contract validation
- input schema normalization
- field schema helpers
- representation negotiation primitives
- protocol surface types

This layer should stay framework-light and independent from browser UI concerns.

### `src/content/`

Owns Markdown/content shaping and content-level helpers.

Key responsibilities:

- Markdown serialization
- Markdown rendering helpers
- semantic-slot support
- agent block handling
- content action helpers
- readable surface helpers

This layer supports both runtime validation and projection logic.

### `src/surface/`

Owns the lightweight browser/headless client runtime.

Key responsibilities:

- fetching page and action results
- tracking current route and snapshot state
- adapting returned Markdown responses or compatibility surfaces
- form and action submission
- region patching
- browser history integration
- debug message capture

This is the right layer for custom frontends that want MDAN transport/state
handling without the default UI. This is the one browser-side escape hatch that
should remain public.

### `src/ui/`

Owns the optional default Web Components UI.

Key responsibilities:

- component registration
- default rendering of page content, fields, and actions
- mounting the UI onto a headless host

This layer depends on browser custom elements and Lit. It should remain
optional, separate from server or protocol-only code, and secondary to the
`root + surface` story.

## Host Boundary

`@mdanai/sdk/server/node` and `@mdanai/sdk/server/bun` are thin runtime-specific
integration layers on top of `src/server/`.

They own:

- request body reading
- cookie integration
- static-file serving
- browser-shell document handling
- browser form bridging

They should not absorb protocol or business logic that belongs in the shared
server runtime.

## Response Model

The runtime currently supports these representations:

- `text/markdown`: preferred public read path
- `text/html`: browser projection for page `GET` requests
- `text/event-stream`: stream action responses
- `application/json`: legacy compatibility path only where still supported

That representation split is deliberate:

- agents and tests should be able to consume the same Markdown response directly
- browsers should be able to load readable HTML without inventing a separate app model
- compatibility JSON should not drive new application design

## Examples And Verification

Examples exercise the intended surfaces:

- `examples/starter/`: smallest Markdown-first app path
- `examples/docs-starter/`: docs-oriented Markdown-first app
- `examples/auth-guestbook/`: canonical auth flow
- `demo/weather-markdown/`: deliverable Markdown-first service

Tests are organized by concern rather than by one giant integration suite:

- `test/core/`: low-level content, schema, protocol, and validation behavior
- `test/server/`: runtime, adapters, assets, sessions, response semantics
- `test/web/`: browser/headless runtime behavior
- `test/ui/`: default UI package surface
- `test/agent-eval/`: agent-consumption quality framework

## Design Rules

- Keep `root`, `surface`, `server`, and `ui` boundaries explicit
- Treat `root` as the primary product surface
- Treat `surface` as the custom frontend boundary
- Treat `server` and `ui` as secondary implementation/integration layers
- Prefer Markdown-native behavior over expanding legacy JSON usage
- Promote helpers into public exports deliberately; do not rely on deep imports
- Keep browser runtime concerns out of protocol-only modules
- Keep Lit and UI concerns out of `surface`
- Update contract docs when public behavior changes
