# @mdanai/sdk

`@mdanai/sdk` is the official SDK for building MDAN agent apps, skills apps,
and online skills.

MDAN is a Markdown-first application surface model for shared human and agent
interaction. A page stays readable as Markdown, carries explicit action
contracts, and can be projected to browser HTML from the same server flow.

It is designed for teams building agent-facing apps, skills apps, online
skills, interactive internal tools, and other workflows where the same surface
should work for both humans and AI agents.

## Start Here

Fastest path:

```bash
npm create mdan@latest agent-app
cd agent-app
npm install
npm start
```

Then:

- open `http://127.0.0.1:4321/`
- edit `app/index.md`
- run `curl -H 'Accept: text/markdown' http://127.0.0.1:4321/`

If you want to explore from this repo first, run:

```bash
bun run dev:starter
```

and follow [examples/starter/README.md](https://github.com/mdan-ai/mdan/blob/main/examples/starter/README.md).

## What You Build With It

MDAN fits apps where the same surface should work for:

- humans in a browser
- agents over HTTP
- workflows that need readable state plus explicit next actions

Typical use cases:

- agent apps and internal tools
- guided forms and skills apps
- online skills exposed over shared Markdown surfaces
- interactive docs and runbooks
- multi-step workflows that return both results and next actions

## Install

```bash
npm install @mdanai/sdk
```

## Main Entry Points

Default path:

- `@mdanai/sdk`: app authoring with `createApp`, `page`, `route`, `action`, `actions`, `fields`
- `@mdanai/sdk/server/node`: host with Node HTTP
- `@mdanai/sdk/server/bun`: host with Bun

Advanced path:

- `@mdanai/sdk/surface`: custom frontend/runtime escape hatch
- `@mdanai/sdk/server`: lower-level runtime helpers for sessions, assets, streaming, and internal runtime control

## Recommended Entry Paths

- `app + browser shell`
  Start here when you want the fastest path to a browser app and agent-readable Markdown surface from the same server.
- `app + surface`
  Use this when you want the root app API on the server but your own frontend on top of `@mdanai/sdk/surface`.
- `server only`
  Use this when you intentionally need lower-level runtime control, custom integrations, or direct server modeling.

## Minimal App

```ts
import { actions, createApp, fields } from "@mdanai/sdk";
import type { InferAppInputs } from "@mdanai/sdk";
import { createHost } from "@mdanai/sdk/server/bun";

const messages = ["Welcome to MDAN"];
const submitInput = {
  message: fields.string({ required: true })
} as const;
type SubmitMessageInputs = InferAppInputs<typeof submitInput>;

const app = createApp({
  appId: "starter",
  browserShell: {
    title: "MDAN Starter"
  }
});

const home = app.page("/", {
  markdown: `# Starter App

## Purpose
Basic MDAN starter flow.

## Context
This page shows the current message feed and the next available actions.

## Rules
Read the feed from the returned surface and submit messages through the declared action contract.

## Result
The surface should expose the current messages and next allowed actions.

::: block{id="main" actions="refresh_main,submit_message" trust="untrusted"}`,
  actions: [
    actions.read("refresh_main", {
      label: "Refresh",
      target: "/"
    }),
    actions.write("submit_message", {
      label: "Submit",
      target: "/post",
      input: submitInput
    })
  ],
  render(currentMessages: string[]) {
    return {
      main: currentMessages.map((message) => `- ${message}`).join("\n")
    };
  }
});

app.route(home.bind(messages));

app.bindActions(home, {
  submit_message: async ({ inputs }) => {
    const typed = inputs as SubmitMessageInputs;
    const message = String(typed.message ?? "").trim();
    if (message) {
      messages.unshift(message);
    }
    return home.bind(messages).render();
  }
});

export default createHost(app, {
  browserShell: {
    title: "MDAN Starter"
  }
});
```

## App API Shape

- `createApp(...)`: create the app runtime
- `actions.route(id, options)`: declare route-style page navigation actions
- `actions.read(id, options)`: declare read/query actions
- `actions.write(id, options)`: declare mutation actions
- `app.page(path, config)`: define a reusable page
- `app.route(page)`: register a page that can render directly
- `app.route(path, handler)`: bind request-time state to a page or route
- `app.bindActions(page, handlers)`: register handlers from declared page action ids
- `app.action(path, handler)`: register a POST action handler
- `app.action(path, { method: "GET" }, handler)`: register a GET action handler
- `app.read(path, handler)`: semantic helper for GET read handlers
- `app.write(path, handler)`: semantic helper for POST write handlers
- `getHeader(request, name)`, `getCookie(request, name)`, `getQueryParam(request, name)`: request read helpers on root API
- `page.actionJson()`: inspect compiled action JSON (`actions` + `allowed_next_actions`)
- `page.bind(state)`: associate current state with a page definition
- `page.render(state)`: render directly when you want the explicit form

Field helpers include:

- `fields.string()`, `fields.number()`, `fields.boolean()`
- `fields.enum([...])`, `fields.date()`, `fields.datetime()`
- `fields.array(itemField)`, `fields.object(shape)`

For stateful pages, `page.bind(...)` is the shortest path:

```ts
app.route(home.bind(messages));
return home.bind(messages).render();
```

## Runtime Model

- `text/markdown` is the canonical public read representation
- `text/html` is the browser projection of the same surface
- POST action submissions use JSON request bodies
- action proof is enabled by default

The SDK can project a readable surface result into the canonical Markdown
surface representation and fill `app_id`, `state_id`, and `state_version` when
you configure `createApp({ appId })`.

## Custom Frontends

If you want your own React, Vue, or other frontend instead of the shipped
browser shell, build on:

```ts
import { createHeadlessHost } from "@mdanai/sdk/surface";
```

Use the root app API for app authoring, and only reach for `surface` when you
intentionally want to own the browser UI layer.

## Docs

- [Quickstart](https://docs.mdan.ai/quickstart)
- [What is MDAN?](https://docs.mdan.ai/what-is-mdan)
- [What is MDAN?](https://docs.mdan.ai/what-is-mdan)
- [API Reference](https://docs.mdan.ai/api-reference)
- [Spec Overview](https://github.com/mdan-ai/mdan/blob/main/spec/index.md)
- [Application Surface Spec](https://github.com/mdan-ai/mdan/blob/main/spec/application-surface.md)

Repo-local docs:

- [Architecture](https://github.com/mdan-ai/mdan/blob/main/ARCHITECTURE.md)
- [Contributing](https://github.com/mdan-ai/mdan/blob/main/CONTRIBUTING.md)
- [Examples](https://github.com/mdan-ai/mdan/tree/main/examples)
