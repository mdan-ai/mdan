# MDAN Express Starter

This is the smallest runnable Express integration example.

## Files

- `app/index.md`
  - page source
- `app/server.ts`
  - app logic, using the same shape as the regular starter
- `app/client.ts`
  - default UI mount
- `app/express-adapter.ts`
  - thin adapter that maps Express `req/res` into `server.handle()`
- `index.mjs`
  - local Express host

## Start

Run once from the repository root:

```bash
npm install
cd examples/express-starter
npm start
```

Or with Bun for install/build work:

```bash
bun install
cd examples/express-starter
npm start
```

Open:

- `http://127.0.0.1:4330/`
