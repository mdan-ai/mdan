# create-mdan

`create-mdan` scaffolds a minimal MDAN app.

Use it when you want the fastest path from a blank directory to a working MDAN app.

It supports both Node and Bun starters.

## Usage

Node starter:

```bash
npm create mdan@latest agent-app
cd agent-app
npm install
npm start
```

Bun starter:

```bash
bunx create-mdan agent-app
cd agent-app
bun install
bun start
```

You can override the generated runtime explicitly:

```bash
npm create mdan@latest agent-app -- --runtime bun
bunx create-mdan agent-app --runtime node
```

Defaults:

- `npm create` and `npx create-mdan` default to the Node starter
- `bunx create-mdan` defaults to the Bun starter

The generated app uses this small shape:

- `app/index.md`
- `app/server.ts`
- `app/client.ts`
- `index.mjs`

## Docs

- [Docs](https://docs.mdan.ai/)
- [Getting Started](https://docs.mdan.ai/getting-started)
- [Understanding MDAN](https://docs.mdan.ai/understanding-mdan)
- [Examples](https://docs.mdan.ai/examples)
- [SDK Overview](https://docs.mdan.ai/sdk)
