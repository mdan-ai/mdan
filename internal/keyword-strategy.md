---
title: Keyword Strategy
description: Package discovery and docs-page keyword strategy for MDAN, @mdanai/sdk, and create-mdan.
---

# Keyword Strategy

This document defines how MDAN should describe itself across npm, GitHub, and
the docs site so search intent stays clear.

The goal is not to stuff every page with every possible keyword. The goal is to
give each package and each high-intent page a clear search job.

## Positioning Layers

There are three product layers to optimize:

1. `MDAN`
   The product/category concept.
2. `@mdanai/sdk`
   The official SDK for building MDAN apps.
3. `create-mdan`
   The fastest way to scaffold a new MDAN app.

These layers should not compete for exactly the same phrasing.

## Core Terms

The stable primary terms are:

- `agent app`
- `skills app`
- `web skills`
- `interactive markdown`
- `Markdown surface`
- `shared human and agent interaction`

The stable supporting terms are:

- `agent interface`
- `agent workflow`
- `interactive docs`
- `internal tools`
- `multi-step workflows`

Avoid overusing:

- vague generic words like `framework`, `platform`, `tooling` without the app
  context
- old protocol-first wording that hides the app value
- deprecated transport terms such as `JSON surface envelope`

## Package Intent Split

### `@mdanai/sdk`

Primary search intent:

- `agent app sdk`
- `skills app sdk`
- `web skills sdk`
- `interactive markdown sdk`
- `agent interface sdk`

Primary message:

- this is the official SDK
- this is what you use to build apps
- it supports both agent-facing and human-facing flows
- it is the SDK for taking local skills and turning them into web skills

The package README and metadata should emphasize:

- app authoring
- page, route, action, and state-binding flow
- Node/Bun hosting
- custom frontend escape hatch only as secondary guidance

### `create-mdan`

Primary search intent:

- `create agent app`
- `agent app starter`
- `skills app starter`
- `markdown app starter`

Primary message:

- this is the scaffold/CLI
- this is the fastest way to start
- it generates a project that already follows the public SDK path

The package README and metadata should emphasize:

- quickstart commands
- generated project shape
- runtime choice (`node` / `bun`)

## README Strategy

### Root README

The root `README.md` doubles as the npm README for `@mdanai/sdk`.

Its first screen should answer:

1. What is `@mdanai/sdk`?
2. What kinds of apps is it for?
3. What is the fastest path to try it?

The first 20-30 lines should consistently include:

- `agent apps`
- `skills apps`
- `web skills`
- `interactive Markdown surfaces`
- `shared human and agent interaction`

### `create-mdan` README

This README should stay short and command-oriented.

It should answer:

1. What is `create-mdan`?
2. How do I scaffold a project?
3. What do I get?

It should not repeat the full SDK product story.

## Docs-Site Intent Split

Different docs pages should target different search questions.

### `What is MDAN`

Primary terms:

- `what is MDAN`
- `agent app`
- `skills app`
- `interactive markdown app`

### `Getting Started`

Primary terms:

- `MDAN quickstart`
- `build agent app`
- `create agent app`

### `Build Your First App`

Primary terms:

- `build agent app`
- `first MDAN app`
- `interactive markdown app`

### `Examples`

Primary terms:

- `agent app examples`
- `skills app examples`
- `interactive markdown examples`

### `API Reference`

Primary terms:

- `MDAN SDK API`
- `agent app sdk api`
- `page route action api`

## Support Pages

Not every docs page needs an independent keyword job.

The following pages should primarily help users complete tasks after they have
already entered the docs site through a higher-intent page:

- `Developer Paths`
- `Custom Rendering`
- `Server Integration`
- `Application Structure`
- `Deployment And Production`
- runtime, sessions, assets, errors, and streaming guides

These pages should still use clear language, but they should not be optimized
as if they are the primary discovery surfaces for MDAN.

## GEO Guidance

For AI-oriented discovery, stable summary language matters more than keyword
volume.

These statements should stay consistent across the main docs and package pages:

- `MDAN is a Markdown-first application surface model.`
- `@mdanai/sdk is the official SDK for building MDAN agent apps, skills apps, and web skills.`
- `create-mdan is the fastest way to start a new MDAN app.`
- `MDAN apps use readable Markdown surfaces plus explicit action contracts.`

These exact ideas should recur in multiple places with low wording drift.

## Near-Term Actions

1. Keep npm package descriptions aligned with the package intent split.
2. Keep the root README optimized for `@mdanai/sdk`, not for the whole repo.
3. Keep `create-mdan/README.md` optimized for scaffold intent only.
4. Focus docs keyword work on a small number of high-intent entry pages, not on
   every docs page equally.
5. Keep support pages useful and specific, but do not force them into weak
   keyword targets with little user intent.
6. Avoid reintroducing deprecated terms into package descriptions or top-level
   docs.
