# create-mdan

Scaffold a minimal MDAN app that uses `@mdanai/sdk`.

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

Choose a runtime explicitly:

```bash
npm create mdan@latest agent-app -- --runtime bun
bunx create-mdan agent-app --runtime node
```

## Generated Project

The generated app includes:

- a Markdown-first MDAN page
- a simple message action
- Node or Bun hosting
- `@mdanai/sdk` dependency pinned to the compatible minor line

The generated project uses public SDK entry points only:

- `@mdanai/sdk/server`
- `@mdanai/sdk/server/node`
- `@mdanai/sdk/server/bun`
