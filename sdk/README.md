# @mdanai/sdk

`@mdanai/sdk` is the reference SDK for building apps with MDAN.

It officially supports Node and Bun through a shared server runtime plus runtime-specific host adapters.

MDAN is a Markdown-first page and interaction format. `@mdanai/sdk` gives you the parser, server runtime, browser runtime, and default UI for working with it.

## Why MDAN

Plain Markdown is good for content, but weak at expressing interaction.

Once a page needs inputs, actions, partial updates, or navigation, that structure usually gets pushed into templates, frontend state, and custom API glue.

MDAN makes that interaction layer explicit while keeping the page source readable for humans, AI agents, and agentic systems.

In MDAN, page content is not only presentation. It is also shared prompt context for AI agents.

The same Markdown source can carry:

- content for humans to read
- state and task context for AI agents to interpret
- explicit interaction structure for both sides to continue from

The default server runtime keeps Markdown canonical while also supporting explicit `auto` `GET` dependencies. Server hosts resolve `auto` before returning results, so agents and browsers observe the same final state. See the spec and runtime docs for the full rules.

## Use Cases

- skills apps with guided inputs and step-by-step actions for non-technical users
- agent apps that agents can read, enter, and continue over HTTP
- interactive docs, runbooks, and internal tools with embedded actions
- shared pages where humans and agents work from the same content and next-step actions
- agentic workflows where the server returns both updated results and the next actions to take
- custom hosted interfaces built with React, Vue, or your own server stack

## Syntax

The starter page keeps Markdown content and the interaction block in the same file:

```text
---
title: "Agent App"
---

# Agent App

Use this starter as the smallest end-to-end MDAN app.

<!-- mdan:block main -->

BLOCK main {
  INPUT message:text required
  GET load_messages "/list" AUTO
  GET refresh "/list" LABEL "Refresh"
  POST submit "/post" WITH message LABEL "Submit"
}
```

## Quick Start

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

You can also force either runtime with `--runtime node` or `--runtime bun`.

## Runtime Adapters

Shared server modeling stays on `@mdanai/sdk/server`:

```ts
import { createHostedApp } from "@mdanai/sdk/server";
```

Then choose the host adapter for your runtime:

```ts
import { createHost } from "@mdanai/sdk/server/node";
```

```ts
import { createHost } from "@mdanai/sdk/server/bun";
```

## Docs

- [Getting Started](https://docs.mdan.ai/getting-started)
- [Understanding MDAN](https://docs.mdan.ai/understanding-mdan)
- [SDK Overview](https://docs.mdan.ai/sdk)
- [Custom Rendering](https://docs.mdan.ai/custom-rendering)
- [Web Runtime](https://docs.mdan.ai/web-runtime)
- [API Reference](https://docs.mdan.ai/api-reference)

## Browser Debugging

If you want to inspect raw browser-side MDAN traffic while using the default UI or your own custom renderer, enable debug messages on the headless host:

```ts
import { createHeadlessHost } from "@mdanai/sdk/web";

const host = createHeadlessHost({
  root: document,
  debugMessages: true
});
```

When enabled:

- the browser records outgoing and incoming MDAN messages
- each record keeps the raw Markdown payload
- messages are available at `window.__MDAN_DEBUG__.messages`
- the default `elements` UI also shows a small debug drawer in the browser
