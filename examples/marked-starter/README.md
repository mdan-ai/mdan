# MDAN Marked Starter

This is the smallest runnable example of plugging a third-party Markdown renderer into MDAN.

It does a few simple things:

- `server` uses the same `markdownRenderer` for browser HTML output
- `elements` uses the same `markdownRenderer` for the default UI
- the agent path still stays on raw `md + mdan`
- the third-party library is `marked`

## Run It

```bash
cd examples/marked-starter
npm start
```

Or with Bun for install/build work:

```bash
bun install
bun run build
cd examples/marked-starter
npm start
```

Then open:

- `http://127.0.0.1:4326/`

## Structure

- `app/index.md`
  - page source
- `app/server.ts`
  - server-side `marked` integration
- `app/client.ts`
  - default UI-side `marked` integration
- `index.mjs`
  - local runtime shell
