# create-mdan

`create-mdan` scaffolds a minimal MDAN app that uses the current `@mdanai/sdk` public runtime.

Generated starters use the artifact-native MDAN flow:

- browsers read `text/html`
- agents read `text/markdown`
- actions return updated Markdown artifacts from the same server

## Usage

Node starter:

```bash
npm create mdan@latest agent-app
cd agent-app
npm install
npm start
```

Then:

- open `http://127.0.0.1:4321/`
- edit `app/index.md` to change the page
- run `curl -H 'Accept: text/markdown' http://127.0.0.1:4321/` to inspect the canonical artifact

Bun starter:

```bash
bunx create-mdan agent-app
cd agent-app
bun install
bun start
```

Then:

- open `http://127.0.0.1:4321/`
- edit `app/index.md` to change the page
- run `curl -H 'Accept: text/markdown' http://127.0.0.1:4321/` to inspect the canonical artifact

You can choose the runtime explicitly:

```bash
npm create mdan@latest agent-app -- --runtime bun
bunx create-mdan agent-app --runtime node
```

Generated projects use:

- `@mdanai/sdk` for app authoring
- `@mdanai/sdk/server/node` or `@mdanai/sdk/server/bun` for host integration
