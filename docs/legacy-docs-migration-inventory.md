---
title: Legacy Docs Migration Inventory
description: Inventory of old tssdk docs content and recommendations for what to migrate into the current SDK docs site.
---

# Legacy Docs Migration Inventory

This document reviews the old docs set under `../tssdk/docs` and classifies each
page for the current SDK docs site.

Goal:

- keep the new docs site focused on the current artifact-first SDK
- reuse good conceptual writing from the old docs where it still fits
- avoid importing pages that are tightly coupled to removed APIs or examples

## Decision Rules

Use these buckets:

- `Adopt soon`
  The old page covers a topic we still need, and most of the value is conceptual
  or only needs light rewriting.
- `Rewrite from old`
  The topic is still needed, but the old page is too tied to obsolete package
  names, APIs, or example structure to move directly.
- `Do not migrate yet`
  The page is obsolete, redundant with current docs, or too coupled to removed
  demos and release lines.

## Current Coverage Gaps

The current docs site is strong on runtime and contract material, but still thin
on these developer-facing topics:

- a product-level "What is MDAN?" page
- a conceptual "Understanding MDAN" page
- a comparison page such as "MDAN vs MCP"
- a "choose your path" page for common developer entry points
- a custom rendering guide for framework users
- a true API reference page that summarizes exported helpers, not just package boundaries

These should drive the first migration batch.

## Old Docs Review

### `index.md`

Status: `Rewrite from old`

Why:

- the old homepage copy is still strong at explaining what MDAN is
- but it assumes a broader product-docs site structure that we have not rebuilt
- several links point to pages we do not yet have in the new site

Recommendation:

- reuse sections such as "What MDAN Is", "What Problem It Solves", and "When To Use MDAN"
- fold the best parts into the new docs home or a dedicated `what-is-mdan.md`

### `getting-started.md`

Status: `Partially adopted already`

Why:

- we already created a new `docs/getting-started.md`
- the old version still has useful product framing, but it references older release numbers and starter structure

Recommendation:

- keep the current page as the canonical start page
- pull over any missing onboarding language later, but do not migrate the old page as-is

### `examples.md`

Status: `Rewrite from old`

Why:

- the old page has a good "which example should I read first?" framing
- but it references old examples like `guestbook`, `agent-tasks`, and framework starters that are not the current core examples

Recommendation:

- keep the new `docs/examples.md`
- selectively import the old explanation style, not the old example list

### `what-is-mdan.md`

Status: `Adopt soon`

Why:

- this is still a missing page in the new docs site
- the content is mostly conceptual and not tightly bound to old APIs

Recommendation:

- migrate this early
- update wording so it matches the artifact-first runtime and current SDK positioning

### `mdan-vs-mcp.md`

Status: `Adopt soon`

Why:

- still useful as a product/comparison page
- mostly conceptual and only needs light modernization

Recommendation:

- migrate early
- trim anything that overcommits beyond the current SDK/docs scope

### `understanding-mdan.md`

Status: `Adopt soon`

Why:

- still fills a real conceptual gap in the current docs site
- mostly model-level explanation

Recommendation:

- migrate early
- rewrite examples so they use the current artifact-first language and current block/action terms where needed

### `developer-paths.md`

Status: `Rewrite from old`

Why:

- the topic is still important
- but the old page is centered on old package names like `web` and `elements`

Recommendation:

- rewrite around current choices:
  - `server + ui`
  - `server + surface`
  - `server only`
- likely publish as a new guides page rather than importing old copy directly

### `application-structure.md`

Status: `Rewrite from old`

Why:

- the topic still matters
- but the old file layout assumes `app/server.ts`, `app/client.ts`, and older starter structure

Recommendation:

- keep as a future page
- rewrite against current `create-mdan` output and current examples

### `agent-consumption.md`

Status: `Rewrite from old`

Why:

- still highly relevant
- but current repo already has more precise runtime/reference material in `docs/2026-04-12-agent-consumption-contract.md`

Recommendation:

- do not migrate the page verbatim
- use it as source material for a future high-level guide that sits above the current contract doc

### `agent-app-demo.md`

Status: `Do not migrate yet`

Why:

- it depends on old demos like `guestbook`, `vault`, and `agent-tasks`
- those are not the current canonical examples in this repo

Recommendation:

- revisit only after we have a current multi-step demo worth documenting

### `custom-rendering.md`

Status: `Adopt soon`

Why:

- the topic still matters
- the browser-runtime idea survives, even though package names changed

Recommendation:

- migrate soon
- rewrite imports from `@mdanai/sdk/web` to `@mdanai/sdk/surface`
- rewrite UI references from `elements` to the current `ui` package or framework-owned rendering

### `server-integration.md`

Status: `Rewrite from old`

Why:

- still useful, especially for existing backends
- but the old page is built around older host/runtime entry points

Recommendation:

- rewrite from scratch using current `createMdanServer()` and host adapters

### `server-runtime.md`

Status: `Do not migrate`

Why:

- the current repo already has a stronger and more accurate replacement:
  `docs/RUNTIME-CONTRACT.md`
- the old page is tied to `createHostedApp` and older runtime APIs

Recommendation:

- use the old page only as historical reference if prose is helpful

### `web-runtime.md`

Status: `Rewrite from old`

Why:

- the topic still matters
- but package names and concepts changed from `web` to `surface`

Recommendation:

- create a future high-level guide above the current
  `docs/BROWSER-AND-HEADLESS-RUNTIME.md`

### `elements.md`

Status: `Rewrite from old`

Why:

- topic still exists in spirit
- but the package name and positioning changed from `elements` to `ui`

Recommendation:

- fold into a future "Default UI" page if we decide it is needed
- do not migrate directly

### `sdk.md`

Status: `Do not migrate`

Why:

- the current repo already has a stronger replacement in `docs/PUBLIC-API.md`
- the old page refers to old subpaths like `core`, `web`, and `elements`

Recommendation:

- use only as a reminder of the narrative shape, not as content source

### `api-reference.md`

Status: `Rewrite from old`

Why:

- we still need a real API reference page in the new docs site
- but the old page is centered on APIs that no longer define the current public surface

Recommendation:

- build a new API reference page from current exports
- do not port old signatures directly

### `session-provider.md`

Status: `Do not migrate`

Why:

- current repo already has `docs/SESSIONS.md`, which is more current and implementation-accurate

Recommendation:

- no migration needed

## Old Release Notes

Old release docs under `../tssdk/docs/releases`:

Status: `Do not migrate yet`

Why:

- tied to old package and product history
- not useful for the current docs site until we define a stable release-notes policy

Recommendation:

- keep current `CHANGELOG.md` as the canonical change record for now

## Old Chinese Mirror Docs

Old docs under `../tssdk/docs/zh`:

Status: `Do not migrate yet`

Why:

- they mirror the old English docs set, which itself still needs curation
- importing both languages now would double migration work before the English/current-content structure stabilizes

Recommendation:

- migrate English/current-content structure first
- decide later whether Chinese docs should be selective or mirrored

## Suggested Migration Order

### Batch 1

Highest value, lowest rewrite cost:

- `what-is-mdan.md`
- `mdan-vs-mcp.md`
- `understanding-mdan.md`
- `custom-rendering.md`

### Batch 2

Important but requires more current-SDK rewriting:

- `developer-paths.md`
- `application-structure.md`
- `server-integration.md`
- `api-reference.md`

### Batch 3

Only after we have stronger current demos or clearer product scope:

- `agent-consumption.md` as a higher-level guide above current contract docs
- `agent-app-demo.md`
- UI-specific page derived from `elements.md`

## One-Line Summary

The old docs set is still valuable mainly for concept pages and narrative
structure. The best first moves are to migrate concept-heavy pages, while
runtime/API/example pages should mostly be rewritten against the current
artifact-first SDK rather than copied directly.
