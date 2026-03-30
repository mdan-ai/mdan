---
title: Getting Started
description: Build and run your first MDSN app with @mdsnai/sdk.
---

# Getting Started

This guide gets you from zero to a running MDSN app.

## Option A: Start from the published starter

```bash
npm create mdsn@latest my-app
cd my-app
npm install
npm run start
```

Open `http://127.0.0.1:3000/` (or the port printed by your app).

## Option B: Start from this repository

```bash
npm install
npm run build
npm test
```

Then run one of the example shells under `examples/*/dev.mjs`.

## Starter Shape

`create-mdsn` generates a minimal app:

- `app/guestbook.md`
- `app/server.ts`
- `app/client.ts`
- `index.mjs`

## Core Loop

1. Define canonical page source in Markdown.
2. Use `composePage()` to attach runtime block content.
3. Register actions with `createHostedApp({ pages, actions })`.
4. Host with `createNodeHost()`.
5. In browser, mount `createHeadlessHost()` and optionally `mountMdsnElements()`.

## Next

- [Developer Paths](/docs/developer-paths)
- [SDK Overview](/docs/sdk)
- [Examples](/docs/examples)

## First Working Server (Minimal)

```ts
import { readFile } from "node:fs/promises";
import { composePage } from "@mdsnai/sdk/core";
import { createHostedApp, createNodeHost } from "@mdsnai/sdk/server";
import http from "node:http";

const source = await readFile("./app/guestbook.md", "utf8");

const server = createHostedApp({
  pages: {
    "/guestbook": () => composePage(source)
  },
  actions: []
});

http.createServer(createNodeHost(server, { rootRedirect: "/guestbook" })).listen(3000);
```

## Common Pitfalls

- Page route exists but `rootRedirect` still points to another path.
- Action target path and markdown operation target mismatch.
- Browser enhancement loaded before client build output is available.

## Example Mapping

- Minimal baseline: [examples/starter/src/index.ts](/Users/hencoo/projects/mdsn/examples/starter/src/index.ts)
- Runtime shell: [examples/starter/dev.mjs](/Users/hencoo/projects/mdsn/examples/starter/dev.mjs)
