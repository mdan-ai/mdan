---
title: Contributing
description: Maintainer guide for contributing to the MDAN TypeScript SDK, including repository layout, commands, docs updates, and test expectations.
---

# Contributing

This repository contains the reference TypeScript SDK for building MDAN apps.

The current codebase is centered on a Markdown-first runtime:

- `text/markdown` is the canonical read path
- `text/html` is the browser projection for page reads
- `application/json` remains a legacy compatibility path where explicitly supported

## Repository Layout

- `src/server/`: runtime modeling, request handling, action proofing, assets, sessions, response generation
- `src/surface/`: headless browser/client runtime for transport, route state, and action submission
- `src/ui/`: optional default Web Components UI
- `src/content/`: Markdown and content helpers
- `src/protocol/`: protocol contracts, schema normalization, negotiation helpers
- `test/`: active runtime, API, UI, browser, and contract tests
- `examples/`: runnable SDK examples
- `demo/weather-markdown/`: focused Markdown-first demo app
- `docs/`: implementation notes, contracts, and migration history
- `spec/`: standard-layer protocol and compatibility specifications
- `docs-site/`: developer docs site that renders current repository docs and specs
- `create-mdan/`: starter project scaffolder

## Prerequisites

- Node `>=20`
- Bun available on your machine for local scripts and tests

Install dependencies from the repository root:

```bash
npm install
```

If you work on generated starter output or `create-mdan`, also install its dependencies:

```bash
npm --prefix create-mdan install
```

## Common Commands

Build everything:

```bash
npm run build
```

Run the stable baseline test suite:

```bash
npm test
```

Run coverage gates:

```bash
npm run test:coverage
```

Run the minimal legacy compatibility regression subset:

```bash
npm run test:json
```

Run the full active test tree:

```bash
npm run test:tssdk-migrated
```

Lint the workspace:

```bash
npm run lint
```

Test the project scaffolder:

```bash
npm run test:create-mdan
```

Build the docs site:

```bash
npm run build:docs-site
```

## Local Development

The example dev scripts perform an initial local SDK build, keep `dist/` and
`dist-browser/` up to date, and start the example server against local browser
bundles.

Useful entry points:

```bash
npm run dev:starter
npm run dev:docs-starter
npm run dev:auth-guestbook
npm run dev:weather-markdown
npm run dev:docs-site
```

## Documentation Expectations

When behavior changes, update the closest contract document in `docs/` in the
same branch whenever practical.

Most common mappings:

- public package surface or import guidance: `docs/sdk-packages.md` and `docs/api-reference.md`
- runtime behavior, representations, result semantics: `docs/server-behavior.md`
- browser host and headless runtime behavior: `docs/browser-behavior.md`
- server adapter behavior: `docs/server-adapters.md`
- request validation and status behavior: `spec/error-model.md`
- action proof rules: `spec/action-proof.md`
- inputs and uploaded assets: `docs/uploads-and-assets.md`
- session lifecycle: `docs/sessions.md`
- streaming behavior: `docs/streaming.md`

If you change the top-level product story, quick start, or doc index, also
update `README.md`.

## Testing Guidance

Prefer targeted tests near the changed subsystem, then run the smallest command
set that gives confidence:

- docs-only changes: usually no test run required
- server/runtime changes: `npm test`
- public API or package boundary changes: `npm test` plus relevant API tests
- scaffolder changes: `npm run test:create-mdan`
- browser/runtime integration changes: baseline suite plus the relevant example tests

If you intentionally change compatibility behavior, update the corresponding
contract docs and regression tests together.

## Compatibility Notes

- Favor public imports only: `@mdanai/sdk`, `@mdanai/sdk/app`,
  `@mdanai/sdk/core`, `@mdanai/sdk/frontend`, `@mdanai/sdk/server`,
  `@mdanai/sdk/server/node`, `@mdanai/sdk/server/bun`, `@mdanai/sdk/surface`
- Do not add new application guidance that depends on `src/` or `dist/` deep imports
- Treat legacy JSON surface support as compatibility coverage, not the preferred new path

## Pull Request Checklist

- The code or docs reflect the current Markdown-first runtime model
- Relevant tests were added or updated when behavior changed
- The nearest contract doc was updated when public behavior changed
- `README.md` was updated if entry-path guidance or product positioning changed
- New examples use public SDK entry points only
