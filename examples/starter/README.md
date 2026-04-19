# starter (surface runtime)

Source layout:

- `app/index.md`
- `app/actions/main.json`
- `app.ts` (loads sources and injects runtime state)

Runtime contract:

- `GET page` supports `text/html`, `application/json`, and `text/markdown`
- `POST action/block` supports `application/json` only
- HTML page responses are rendered on the server from the same `JsonSurfaceEnvelope`

Run:

```bash
cd sdk
bun run dev:starter
```

This command performs an initial SDK build, starts TypeScript watch to keep `dist/` current, and then launches the example server.

Open `http://127.0.0.1:4323/`.

Quick checks:

- `curl -H 'Accept: text/html' http://127.0.0.1:4323/`
- `curl -H 'Accept: application/json' http://127.0.0.1:4323/`
- `curl -H 'Accept: text/markdown' http://127.0.0.1:4323/`
- `curl -X POST -H 'Accept: application/json' -H 'Content-Type: application/json' -d '{"message":"From starter"}' http://127.0.0.1:4323/post`
