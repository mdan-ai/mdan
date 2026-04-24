---
title: Starter Example
description: Smallest runnable MDAN starter example showing Markdown as the canonical response, declared actions, and browser HTML projection.
---

# starter (Markdown-first example)

Source layout:

- `app/index.md`
- `app/index.action.json`
- `app.ts` (uses `createApp`, `page`, `route`, `action`, and `page.bind(...)` to connect markdown, explicit action JSON, and runtime state)

Runtime contract:

- `GET page` supports `text/html` and `text/markdown`
- `GET page` no longer exposes `application/json`; page discovery happens through the Markdown response
- `POST action/block` accepts `application/json` request bodies and returns Markdown responses with `Accept: text/markdown`
- HTML page responses are rendered on the server from the same underlying MDAN state, while Markdown remains the canonical readout

Run:

```bash
cd sdk
bun run dev:starter
```

This command performs an initial SDK build, starts TypeScript watch to keep `dist/` current, and then launches the example server.

Open `http://127.0.0.1:4323/`.

If port `4323` is already in use, run `PORT=4324 bun run dev:starter`.

Quick checks:

- `curl -H 'Accept: text/html' http://127.0.0.1:4323/`
- `curl -H 'Accept: text/markdown' http://127.0.0.1:4323/`

Action proof flow:

1. Fetch the canonical Markdown response:

```bash
curl -H 'Accept: text/markdown' http://127.0.0.1:4323/
```

2. Copy the `action_proof` for `submit_message` from the returned ````mdan` block.

3. Submit a message with that proof:

```bash
curl -X POST \
  -H 'Accept: text/markdown' \
  -H 'Content-Type: application/json' \
  -d '{"action":{"proof":"<proof-from-submit_message>"},"input":{"message":"From starter"}}' \
  http://127.0.0.1:4323/post
```
