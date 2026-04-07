---
title: Getting Started
description: Create your first MDAN app with create-mdan and get it running in a few minutes.
---

# Getting Started

This page does one thing: help you create your first MDAN app and get it running in a few minutes.

MDAN officially supports Node and Bun.

- choose Node if you want the most established host baseline
- choose Bun if you want a Bun-native starter and toolchain entry
- the app model stays the same across both runtimes

Current npm releases:

- `create-mdan@0.6.0`
- `@mdanai/sdk@0.6.0`

## 1. Create and Start a Project

Node starter:

```bash
npm create mdan@latest agent-app
cd agent-app
npm install
npm start
```

Bun starter:

```bash
bunx create-mdan agent-app
cd agent-app
bun install
bun start
```

You can force either runtime with:

```bash
npm create mdan@latest agent-app -- --runtime bun
bunx create-mdan agent-app --runtime node
```

Open `http://127.0.0.1:3000/` by default.

If you set the `PORT` environment variable yourself, use that port instead.

If you prefer, you can also use:

```bash
npx create-mdan agent-app
```

## 2. Key Files

- `app/index.md`
  Page content and interaction definitions live here
- `app/server.ts`
  Page composition, state, and action handlers live here
- `app/client.ts`
  Browser runtime and default UI mounting live here
- `index.mjs`
  Local runtime host entry lives here

## 3. Common Places To Start Editing

In most cases, these two files are enough to get started:

- `app/index.md`
- `app/server.ts`

You can usually leave `app/client.ts` alone until you want to bring your own UI.

## 4. See More Examples

If you are browsing the [MDAN repository](https://github.com/mdan-ai/mdan), you can also run the starter example in `examples/starter/`.

That in-repo example keeps its current Node host shell, even though the published starter can now target Node or Bun.

First run this once from the repository root:

```bash
npm install
```

Or:

```bash
bun install
```

Then start the example from its directory:

```bash
cd examples/starter
npm start
```

You can still use Bun for the install/build side:

```bash
bun install
bun run build
```

## 5. Next

- Want a clearer definition before going deeper: [What is MDAN?](/docs/what-is-mdan)
- Want to understand how it works: [Understanding MDAN](/docs/understanding-mdan)
- Want to start building a real app: [Application Structure](/docs/application-structure)
- Want to browse more examples: [Examples](/docs/examples)
