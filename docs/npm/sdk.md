# @mdanai/sdk

TypeScript SDK for building MDAN apps with Markdown artifacts, structured action contracts, and browser/headless runtimes.

## Install

```bash
npm install @mdanai/sdk
```

## Entry Points

Recommended path:

- `@mdanai/sdk`: define apps with the root app API
- `@mdanai/sdk/server/node`: host a server with Node HTTP
- `@mdanai/sdk/server/bun`: host a server with Bun

Advanced path:

- `@mdanai/sdk/surface`: build a custom frontend on top of the lightweight browser/headless surface runtime
- `@mdanai/sdk/server`: use lower-level runtime helpers for sessions, assets, streaming, and artifact-native responses
- internal browser-shell bundles: shipped default UI implementation used by the browser shell

## Minimal Bun App

```ts
import { actions, createApp } from "@mdanai/sdk";
import { createHost } from "@mdanai/sdk/server/bun";

const app = createApp({
  appId: "hello-mdan",
  browserShell: {
    title: "MDAN App"
  }
});

const home = app.page("/", {
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
  actions: [
    actions.read("refresh_main", {
      label: "Refresh",
      target: "/"
    })
  ],
  render() {
    return {
      main: "## Context\nMinimal starter block.\n\n## Result\n- Ready"
    };
  }
});

app.route(home);

// Use `route(path, handler)` when the page needs request-time state:
// app.route("/", async () => home.render(messages));
// Or bind state first: `app.route(home.bind(messages))`
// After a write action updates state, return `home.bind(messages).render()`.

Bun.serve({
  port: 4321,
  fetch: createHost(app)
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

- Root `createApp()` is the default authoring path for application code.
- Returning a readable surface is the lightest default server authoring path under that app API.
- When you set `createApp({ appId })`, the runtime fills in `app_id`,
  `state_id`, and `state_version` for readable-surface responses when you omit
  them.
- Markdown artifact responses are the preferred public read path.
- Legacy JSON surface responses remain available only as a compatibility bridge.
- POST actions require action proof by default.
- Server-side `auto` dependencies are GET-only and do not bypass external POST proof validation.
- Browser shells can serve local `dist-browser` bundles with `browserShell.moduleMode = "local-dist"`.

## Lower-Level Artifact Helpers

Reach for `@mdanai/sdk/server` only when you need lower-level runtime control
over sessions, assets, streaming, or artifact-native responses.

Artifact-native page assembly remains an internal lower-level SDK concern rather
than part of the recommended public app authoring path.

## Repository

Source, examples, and protocol notes live at <https://github.com/mdan-ai/mdan>.
