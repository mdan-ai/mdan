# create-mdan

`create-mdan` scaffolds a minimal MDAN agent app or skills app that uses the public
`@mdanai/sdk` app API.

Generated starters already follow the current default path:

- Markdown is the public read surface
- browsers use the HTML projection
- actions submit JSON and return updated Markdown surfaces
- the app code uses `createApp`, `page`, `route`, `action`, and `page.bind(...)`

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

Choose the runtime explicitly:

```bash
npm create mdan@latest agent-app -- --runtime bun
bunx create-mdan agent-app --runtime node
```

## What You Get

The generated project includes:

- a Markdown-first starter page
- a simple write action
- Node or Bun hosting
- `@mdanai/sdk` pinned to the compatible minor line

The generated project uses public SDK entry points only:

- `@mdanai/sdk`
- `@mdanai/sdk/server/node`
- `@mdanai/sdk/server/bun`

## Next Step

After scaffolding:

- open `http://127.0.0.1:4321/`
- edit `app/index.md`
- run `curl -H 'Accept: text/markdown' http://127.0.0.1:4321/`
