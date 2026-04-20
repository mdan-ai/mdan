# starter (artifact-native example)

Source layout:

- `app/index.md`
- `app/actions/main.json`
- `app.ts` (loads sources and injects runtime state)

Runtime contract:

- `GET page` supports `text/html` and `text/markdown`
- `GET page` no longer exposes `application/json`; page discovery happens through the Markdown artifact
- `POST action/block` accepts `application/json` request bodies and returns Markdown artifacts with `Accept: text/markdown`
- HTML page responses are rendered on the server from the same underlying MDAN state, while Markdown remains the canonical readout

Run:

```bash
cd sdk
bun run dev:starter
```

This command performs an initial SDK build, starts TypeScript watch to keep `dist/` current, and then launches the example server.

Open `http://127.0.0.1:4323/`.

Quick checks:

- `curl -H 'Accept: text/html' http://127.0.0.1:4323/`
- `curl -H 'Accept: text/markdown' http://127.0.0.1:4323/`
- `curl -X POST -H 'Accept: text/markdown' -H 'Content-Type: application/json' -d '{"action":{"proof":"<proof>"},"input":{"message":"From starter"}}' http://127.0.0.1:4323/post`
