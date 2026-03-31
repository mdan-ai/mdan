---
title: Getting Started
description: Get your first MDSN app running with @mdsnai/sdk.
---

# Getting Started

This page does one thing: get your first MDSN app running in a few minutes.

## 1. Create and Start a Project

```bash
npm create mdsn@latest agent-app
cd agent-app
npm install
npm start
```

Open `http://127.0.0.1:3000/` by default.

If you set the `PORT` environment variable yourself, use that port instead.

If you prefer, you can also use:

```bash
npx create-mdsn agent-app
```

## 2. Key Files

- `app/index.md`
  Page content and interaction definitions live here
- `app/server.ts`
  Page composition, state, and action handlers live here
- `app/client.ts`
  Browser runtime and default UI mounting live here
- `index.mjs`
  Local Node entry point lives here

## 3. Common Places To Start Editing

In most cases, these two files are enough to get started:

- `app/index.md`
- `app/server.ts`

You can usually leave `app/client.ts` alone until you want to bring your own UI.

## 4. See More Examples

If you are browsing the [MDSN repository](https://github.com/mdsn-ai/mdsn), you can also run the starter example in `examples/starter/`.

First run this once from the repository root:

```bash
npm install
```

Then start the example from its directory:

```bash
cd examples/starter
npm start
```

## 5. Next

- Want to understand how it works: [Understanding MDSN](/docs/understanding-mdsn)
- Want to start building a real app: [Application Structure](/docs/application-structure)
- Want to browse more examples: [Examples](/docs/examples)
