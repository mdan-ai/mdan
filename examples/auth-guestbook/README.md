# auth-guestbook (surface runtime)

This example organizes assets into explicit source files while following the page-surface runtime contract:

- `app/login.md`, `app/register.md`, `app/guestbook.md`
- `app/actions/login.json`, `app/actions/register.json`, `app/actions/guestbook.json`
- `app.ts` loads those files and injects runtime state/session values.

Runtime contract:

- `GET page` supports `text/html`, `application/json`, and `text/markdown`
- `POST action/block` supports `application/json` only
- HTML page responses are rendered on the server from the same `JsonSurfaceEnvelope`

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
- `curl -H 'Accept: application/json' http://127.0.0.1:4321/login`
- `curl -H 'Accept: text/markdown' http://127.0.0.1:4321/login`
- `curl -X POST -H 'Accept: application/json' -H 'Content-Type: application/json' -d '{"username":"ada","password":"pw"}' http://127.0.0.1:4321/auth/register`
