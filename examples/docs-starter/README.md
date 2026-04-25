---
title: Docs Starter Example
description: Runnable MDAN docs-style example that serves multiple Markdown pages with a simple read and refresh flow.
---

# docs-starter (Markdown-first docs example)

Source layout:

- `app/index.md`, `app/getting-started.md`
- `app.ts` (uses `createApp`, `page`, and `route` to serve a reusable docs page definition)

Runtime contract:

- `GET page` supports `text/markdown`
- `GET page` no longer exposes `application/json`; page discovery happens through the Markdown response
- the example exposes a `GET` refresh action and returns the same Markdown response contract for action reads
- frontend consumers render UI from the returned markdown surface

Run:

```bash
cd sdk
bun run dev:docs-starter
```

This command performs an initial SDK build, starts TypeScript watch to keep `dist/` current, and then launches the example server.

Open:

- `http://127.0.0.1:4326/` for the shipped browser UI
- `http://127.0.0.1:4326/index.md` if you want the raw markdown route in the browser

Quick checks:

- `curl -H 'Accept: text/markdown' http://127.0.0.1:4326/`
