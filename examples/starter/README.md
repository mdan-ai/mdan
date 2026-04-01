# MDSN Starter

This is the smallest runnable MDSN starter.

## Files

- `app/index.md`
  - page source and interaction definition
- `app/server.ts`
  - state and action handlers
- `app/client.ts`
  - browser runtime mount
- `index.mjs`
  - local Node host

## Start

If you are browsing the [MDSN repository](https://github.com/mdsn-ai/mdsn), this example is the in-repo version of the published starter.

Run once from the repository root:

```bash
npm install
```

Or:

```bash
bun install
```

Then start the example:

```bash
cd examples/starter
npm start
```

You can still use Bun for the install/build side:

```bash
bun install
bun run build
```

Open:

- `http://127.0.0.1:3000/`

## Usual edit points

1. `app/index.md`
2. business state in `app/server.ts`
3. explicit action bindings and handlers in `app/server.ts`

## Core pieces

- page source in `app/index.md`
- state and actions in `app/server.ts`
- browser runtime in `app/client.ts`
- Node host in `index.mjs`
