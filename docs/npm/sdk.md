# @mdanai/sdk

TypeScript SDK for building MDAN apps with Markdown artifacts, structured action contracts, and browser/headless runtimes.

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
  appId: "hello-mdan",
  browserShell: {
    title: "MDAN App"
  }
});

server.page("/", async () =>
  ({
    markdown: `# Hello MDAN

## Purpose
Show a minimal MDAN surface with readable Markdown content and explicit actions.

## Context
The page exposes a readable block and a refresh action.

## Rules
Agents and browsers should use declared actions instead of guessing routes.

## Result
The surface is ready.

::: block{id="main" actions="refresh_main" trust="untrusted"}
:::`,
    actions: {
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
    route: "/",
    regions: {
      main: "## Context\nMinimal starter block.\n\n## Result\n- Ready"
    }
  })
);

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

- Returning a readable surface is the lightest default server authoring path.
- When you set `createMdanServer({ appId })`, the runtime fills in `app_id`,
  `state_id`, and `state_version` for readable-surface responses when you omit
  them.
- Markdown artifact responses are the preferred public read path.
- Legacy JSON surface responses remain available only as a compatibility bridge.
- POST actions require action proof by default.
- Server-side `auto` dependencies are GET-only and do not bypass external POST proof validation.
- Browser shells can serve local `dist-browser` bundles with `browserShell.moduleMode = "local-dist"`.

## Lower-Level Artifact Helpers

`createArtifactPage(...)`, `createArtifactFragment(...)`, and
`createExecutableContent(...)` remain available when you want to build
artifact-native responses directly. Treat them as lower-level helpers rather
than the default app authoring path.

## Repository

Source, examples, and protocol notes live at <https://github.com/mdan-ai/mdan>.
