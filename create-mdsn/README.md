# create-mdsn

`create-mdsn` scaffolds a minimal MDSN app.

Use it when you want the fastest path from a blank directory to a working MDSN app.

It supports both Node and Bun starters.

## Usage

Node starter:

```bash
npm create mdsn@latest agent-app
cd agent-app
npm install
npm start
```

Bun starter:

```bash
bunx create-mdsn agent-app
cd agent-app
bun install
bun start
```

You can override the generated runtime explicitly:

```bash
npm create mdsn@latest agent-app -- --runtime bun
bunx create-mdsn agent-app --runtime node
```

Defaults:

- `npm create` and `npx create-mdsn` default to the Node starter
- `bunx create-mdsn` defaults to the Bun starter

The generated app uses this small shape:

- `app/index.md`
- `app/server.ts`
- `app/client.ts`
- `index.mjs`

## Docs

- [Docs](https://docs.mdsn.ai/)
- [Getting Started](https://docs.mdsn.ai/getting-started)
- [Understanding MDSN](https://docs.mdsn.ai/understanding-mdsn)
- [Examples](https://docs.mdsn.ai/examples)
- [SDK Overview](https://docs.mdsn.ai/sdk)
