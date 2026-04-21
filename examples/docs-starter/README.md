# docs-starter (artifact-native docs example)

Source layout:

- `app/index.md`, `app/getting-started.md`
- `app.ts` (loads docs markdown and defines the refresh action)

Runtime contract:

- `GET page` supports `text/html` and `text/markdown`
- `GET page` no longer exposes `application/json`; page discovery happens through the Markdown artifact
- the example exposes a `GET` refresh action and returns the same Markdown artifact contract for action reads
- HTML page responses are rendered on the server from the same underlying artifact

Run:

```bash
cd sdk
bun run dev:docs-starter
```

This command performs an initial SDK build, starts TypeScript watch to keep `dist/` current, and then launches the example server.

Open `http://127.0.0.1:4326/`.

Quick checks:

- `curl -H 'Accept: text/html' http://127.0.0.1:4326/`
- `curl -H 'Accept: text/markdown' http://127.0.0.1:4326/`
