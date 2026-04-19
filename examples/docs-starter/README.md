# docs-starter (surface runtime)

Source layout:

- `app/index.md`, `app/getting-started.md`
- `app/actions/docs.json`
- `app.ts` (loads docs markdown/action sources)

Runtime contract:

- `GET page` supports `text/html`, `application/json`, and `text/markdown`
- `POST action/block` supports `application/json` only
- HTML page responses are rendered on the server from the same `JsonSurfaceEnvelope`

Run:

```bash
cd sdk
bun run dev:docs-starter
```

This command performs an initial SDK build, starts TypeScript watch to keep `dist/` current, and then launches the example server.

Open `http://127.0.0.1:4326/`.

Quick checks:

- `curl -H 'Accept: text/html' http://127.0.0.1:4326/`
- `curl -H 'Accept: application/json' http://127.0.0.1:4326/`
- `curl -H 'Accept: text/markdown' http://127.0.0.1:4326/`
