---
title: Getting Started
description: Get the current MDAN SDK workspace running, choose the right example, and find the first docs to read.
---

# Getting Started

This page is the fastest way to get oriented in the current SDK workspace.

## 1. Install Dependencies

From the repository root:

```bash
npm install
```

If you are working on the project scaffolder too:

```bash
npm --prefix create-mdan install
```

## 2. Pick A Local Example

The repository already includes runnable examples and demos:

- `npm run dev:starter`
- `npm run dev:docs-starter`
- `npm run dev:auth-guestbook`
- `npm run dev:weather-markdown`

Each command performs an initial local SDK build, watches `dist/` and
`dist-browser/`, and starts the selected app.

See [Examples](/examples) for what each one is good for.

## 3. Choose Your Reading Path

If you want to build with the current SDK:

- start with [What is MDAN?](/what-is-mdan) if you want the product model first
- then read [Developer Paths](/developer-paths) to choose the right entry path
- start with [Public API](/reference/public-api)
- keep `@mdanai/sdk` as the default app entry and `@mdanai/sdk/surface` as the custom frontend escape hatch
- then read [Runtime Contract](/guides/runtime-contract)
- then read [Server Adapters](/reference/server-adapters)

If you want browser-side behavior:

- read [Browser And Headless Runtime](/guides/browser-and-headless-runtime)
- then [UI Action Semantics](/reference/ui-action-semantics)

If you want protocol and standardization context:

- read [Spec Overview](/spec)
- then [Application Surface Spec (ZH)](/spec/application-surface-zh)

## 4. Common Maintainer Commands

```bash
npm test
npm run test:coverage
npm run test:json
npm run lint
```

For contributor-focused repository guidance, see [Contributing](/contributing).
