# MDSN Docs Starter Example

This is a minimal docs website starter built with MDSN runtime primitives.

## What It Demonstrates

- Markdown pages as canonical docs content
- Route-to-page mapping through `createHostedApp()`
- Custom docs HTML shell injected via `renderHtml`
- Static docs CSS served by `createHost()` from `@mdsnai/sdk/server/node`

## Run

From the repository root:

```bash
npm install
cd examples/docs-starter
npm start
```

Or with Bun for install/build work:

```bash
bun install
cd examples/docs-starter
npm start
```

Open:

- `http://127.0.0.1:4332/docs`
