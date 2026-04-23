---
title: Build Your First App
description: Build a minimal MDAN app with the current App API (`createApp`, `page`, `route`, `read/write`, `bindActions`) and run it locally.
---

# Build Your First App

This guide is the canonical starter path for the current SDK.

By the end, you will have:

- one page defined with `app.page(...)`
- one write action contract
- one app handler wired through `app.bindActions(...)`
- one local Bun host

## 1. Create The App Files

```text
app/
  index.md
app.ts
dev.ts
```

If you prefer scaffolding:

```bash
npm create mdan@latest my-app
```

## 2. Write The Page Markdown

Create `app/index.md`:

```md
# Starter App

## Purpose
Show a minimal MDAN page with one declared write action.

## Context
This page shows the current message feed.

## Rules
Submit only actions declared by the current surface.

## Result
The latest messages appear below.

::: block{id="main" actions="submit_message"}
```

## 3. Build The App With `createApp`

Create `app.ts`:

```ts
import { actions, createApp, fields, type InferAppInputs } from "@mdanai/sdk";

const app = createApp({
  appId: "starter"
});

const messages = ["Welcome to MDAN"];
const submitInput = {
  message: fields.string({ required: true, minLength: 1 })
} as const;
type SubmitMessageInputs = InferAppInputs<typeof submitInput>;

const home = app.page("/", {
  markdown: `# Starter App

::: block{id="main" actions="submit_message"}`,
  actions: [
    actions.write("submit_message", {
      label: "Post message",
      target: "/post",
      input: submitInput
    })
  ],
  render(currentMessages: string[]) {
    return {
      main: currentMessages.map((line) => `- ${line}`).join("\n")
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

export default app;
```

## 4. Host It Locally (Bun)

Create `dev.ts`:

```ts
import { createHost } from "@mdanai/sdk/server/bun";
import app from "./app.js";

const host = createHost(app, {
  browserShell: {
    title: "Starter App",
    moduleMode: "local-dist"
  }
});

Bun.serve({
  port: 4321,
  fetch: host
});
```

## 5. Run It

```bash
npm install
npm run build
node scripts/run-example-dev.mjs dev.ts
```

## 6. Verify Both Read Paths

Browser projection:

```bash
curl -H 'Accept: text/html' http://127.0.0.1:4321/
```

Canonical Markdown response:

```bash
curl -H 'Accept: text/markdown' http://127.0.0.1:4321/
```

## 7. Submit An Action

Send a write action request:

```bash
curl -X POST \
  -H 'Accept: text/markdown' \
  -H 'Content-Type: application/json' \
  -d '{"action":{"proof":"<proof>"},"input":{"message":"hello"}}' \
  http://127.0.0.1:4321/post
```

Use the real `action_proof` from the current Markdown response when action proof is enabled.

## 8. Next Steps

- [Quickstart](/getting-started)
- [Public API](/reference/public-api)
- [API Reference](/api-reference)
- [Server Integration](/server-integration) for lower-level runtime/host details
