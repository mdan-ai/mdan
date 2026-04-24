---
title: Auth Guestbook Example
description: Canonical MDAN auth example covering login, registration, session state, and a guestbook posting flow.
---

# auth-guestbook (Markdown surface runtime)

This example organizes assets into explicit source files while following the Markdown surface runtime contract:

- `app/login.md`, `app/register.md`, `app/guestbook.md`
- `app/login.action.json`, `app/register.action.json`, `app/guestbook.action.json`
- `app.ts` uses `createApp`, reusable `page(...)` definitions, `route(...)`, `action(...)`, and `page.bind(...)` to inject runtime state/session values into explicit page manifests.

Runtime contract:

- `GET page` supports `text/html` and `text/markdown`
- `GET page` no longer exposes `application/json`; page discovery happens through the Markdown response
- `POST action/block` accepts `application/json` request bodies and returns Markdown responses with `Accept: text/markdown`
- HTML page responses are rendered on the server from the same underlying runtime state

## Run with Bun

```bash
cd sdk
bun install
bun run dev:auth-guestbook
```

This command performs an initial SDK build, starts TypeScript watch to keep `dist/` current, and then launches the example server.

Open:

- `http://127.0.0.1:4321/login`
- `http://127.0.0.1:4321/register`
- `http://127.0.0.1:4321/guestbook`

Quick checks:

- `curl -H 'Accept: text/html' http://127.0.0.1:4321/login`
- `curl -H 'Accept: text/markdown' http://127.0.0.1:4321/login`
- `curl -X POST -H 'Accept: text/markdown' -H 'Content-Type: application/json' -d '{"action":{"proof":"<proof>"},"input":{"username":"ada","password":"pw"}}' http://127.0.0.1:4321/auth/register`
