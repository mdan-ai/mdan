# create-mdan

`create-mdan` scaffolds a minimal MDAN app that uses the current `@mdanai/sdk` public runtime.

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

You can choose the runtime explicitly:

```bash
npm create mdan@latest agent-app -- --runtime bun
bunx create-mdan agent-app --runtime node
```

Generated projects use:

- `@mdanai/sdk/server`
- `@mdanai/sdk/server/node`
- `@mdanai/sdk/server/bun`
