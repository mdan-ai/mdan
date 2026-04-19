# @mdanai/sdk

TypeScript SDK for building MDAN apps with JSON surface bundles, Markdown content, explicit actions, and browser/headless runtimes.

## Install

```bash
npm install @mdanai/sdk
```

## Entry Points

- `@mdanai/sdk/server`: define MDAN pages, actions, sessions, assets, and action proof behavior
- `@mdanai/sdk/server/node`: host a server with Node HTTP
- `@mdanai/sdk/server/bun`: host a server with Bun
- `@mdanai/sdk/surface`: use the lightweight browser/headless surface runtime
- `@mdanai/sdk/ui`: mount the default Web Components UI

## Minimal Bun App

```ts
import { createMdanServer } from "@mdanai/sdk/server";
import { createHost } from "@mdanai/sdk/server/bun";

const server = createMdanServer({
  browserShell: {
    title: "MDAN App"
  }
});

server.page("/", async () => ({
  content: `# Hello MDAN

## Purpose
Show a minimal JSON-first MDAN surface.

## Context
The page exposes a readable block and a refresh action.

## Rules
Agents and browsers should use declared actions instead of guessing routes.

## Result
The surface is ready.

::: block{id="main" actions="refresh_main" trust="untrusted"}
## Context
Minimal starter block.

## Result
- Ready
:::
`,
  actions: {
    app_id: "hello-mdan",
    state_id: "hello-mdan:home:1",
    state_version: 1,
    response_mode: "page",
    blocks: ["main"],
    actions: [
      {
        id: "refresh_main",
        label: "Refresh",
        verb: "read",
        transport: { method: "GET" },
        target: "/",
        input_schema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      }
    ],
    allowed_next_actions: ["refresh_main"]
  },
  view: {
    route_path: "/",
    regions: {
      main: "## Context\nMinimal starter block.\n\n## Result\n- Ready"
    }
  }
}));

Bun.serve({
  port: 4321,
  fetch: createHost(server)
});
```

## Create A Starter Project

```bash
npm create mdan@latest agent-app
cd agent-app
npm install
npm start
```

For Bun:

```bash
bunx create-mdan agent-app
cd agent-app
bun install
bun start
```

## Runtime Notes

- JSON surface responses include Markdown `content`, an `actions` contract, and `view` metadata.
- POST actions require action proof by default.
- Server-side `auto` dependencies are GET-only and do not bypass external POST proof validation.
- Browser shells can serve local `dist-browser` bundles with `browserShell.moduleMode = "local-dist"`.

## Repository

Source, examples, and protocol notes live at <https://github.com/mdan-ai/mdan>.
