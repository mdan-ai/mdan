# @mdanai/sdk

`@mdanai/sdk` is the official SDK for building MDAN agent apps, skills apps,
and online skills.

MDAN is a Markdown-first application surface model for shared human and agent
interaction. A page stays readable as Markdown and carries explicit action
contracts in the same response.

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

- `@mdanai/sdk`: app authoring + shipped frontend helpers
- `app.host("node" | "bun", options?)`: app-facing host convenience

Advanced path:

- `@mdanai/sdk/core`: shared protocol and markdown-content layer
- `@mdanai/sdk/frontend`: shipped frontend helpers
- `@mdanai/sdk/server/node`: low-level Node host adapter
- `@mdanai/sdk/server/bun`: low-level Bun host adapter
- `@mdanai/sdk/surface`: custom frontend/runtime escape hatch

## Recommended Entry Paths

- `server + frontend`
  Start here when you want the shipped app authoring/server API plus the shipped frontend helpers in the browser.
- `server + surface`
  Use this when you want the server app API but your own frontend on top of `@mdanai/sdk/surface`.
- `server only`
  Use this when you intentionally need lower-level runtime control, custom integrations, or direct server modeling.
- `core only`
  Use this only when you intentionally want the shared protocol/content layer without the server wrapper.

## Minimal App

```ts
import { createApp, fields, type InferAppInputs } from "@mdanai/sdk";
const messages = ["Welcome to MDAN"];
const submitFields = {
  message: fields.string({ required: true })
} as const;
const submitInputSchema = fields.object(submitFields).schema;
type SubmitMessageInputs = InferAppInputs<typeof submitFields>;

const app = createApp({
  appId: "starter"
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
The surface should expose the current messages and declared actions.

<!-- mdan:block id="main" -->`,
  actionJson: {
    version: "mdan.page.v1",
    blocks: {
      main: {
        actions: ["refresh_main", "submit_message"]
      }
    },
    actions: {
      refresh_main: {
        label: "Refresh",
        verb: "read",
        target: "/",
        transport: { method: "GET" },
        input_schema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      submit_message: {
        label: "Submit",
        verb: "write",
        target: "/post",
        transport: { method: "POST" },
        input_schema: submitInputSchema
      }
    }
  },
  render(currentMessages: string[]) {
    return {
      main: currentMessages.map((message) => `- ${message}`).join("\n")
    };
  }
});

app.route(home.bind(messages));

app.action("/post", async ({ inputs }) => {
  const typed = inputs as SubmitMessageInputs;
  const message = String(typed.message ?? "").trim();
  if (message) {
    messages.unshift(message);
  }
  return home.bind(messages).render();
});

export default app.host("bun", {
  frontend: true
});
```

That host shape does two things by default:

- serves the built-in browser entry for natural routes such as `/`
- keeps the raw markdown surface available at `/index.md`

## App API Shape

- `createApp(...)`: create the app runtime
- `app.page(path, config)`: define a reusable page with explicit `actionJson`
- `app.route(page)`: register a page that can render directly
- `app.route(path, handler)`: bind request-time state to a page or route
- `app.action(path, handler)`: register a POST action handler
- `app.action(path, { method: "GET" }, handler)`: register a GET action handler
- `app.read(path, handler)`: semantic helper for GET read handlers
- `app.write(path, handler)`: semantic helper for POST write handlers
- `page.actionJson()`: inspect the explicit action JSON (`blocks` + `actions`)
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
- POST action submissions use JSON request bodies
- action proof is enabled by default

The SDK can project a readable surface result into the canonical Markdown
surface representation and fill `app_id`, `state_id`, and `state_version` when
you configure `createApp({ appId })`.

## Custom Frontends

If you want your own React, Vue, or other frontend instead of the shipped
frontend helpers, build on:

```ts
import { createHeadlessHost } from "@mdanai/sdk/surface";
```

Use the app API for app authoring, and only reach for `surface` when you
intentionally want to own the browser UI layer.

## Docs

- [Quickstart](https://docs.mdan.ai/quickstart)
- [What is MDAN?](https://docs.mdan.ai/what-is-mdan)
- [API Reference](https://docs.mdan.ai/api-reference)
- [Spec Overview](https://github.com/mdan-ai/mdan/blob/main/spec/index.md)
- [Application Surface Spec](https://github.com/mdan-ai/mdan/blob/main/spec/application-surface.md)

Repo-local docs:

- [Architecture](https://github.com/mdan-ai/mdan/blob/main/sdk/docs/architecture.md)
- [Contributing](https://github.com/mdan-ai/mdan/blob/main/CONTRIBUTING.md)
- [Examples](https://github.com/mdan-ai/mdan/tree/main/examples)
