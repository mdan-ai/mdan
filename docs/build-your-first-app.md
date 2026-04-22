---
title: Build Your First App
description: Build a small MDAN app from scratch with one page, one action, and a local host.
---

# Build Your First App

This guide walks through the smallest real MDAN app you can build in the
current SDK.

By the end, you will have:

- one Markdown page
- one action contract
- one server file
- one local host entry

## 1. Create The App Files

Start with this shape:

```text
app/
  index.md
  actions/
    main.json
app.ts
dev.ts
```

If you prefer generated scaffolding, run:

```bash
npm create mdan@latest my-app
```

This guide shows the same structure manually so the moving pieces stay clear.

## 2. Write The Page

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

<!-- mdan:block main -->
```

The Markdown body is the readable surface for both people and agents.

## 3. Declare The Action

Create `app/actions/main.json`:

```json
{
  "app_id": "starter",
  "state_id": "starter:home:1",
  "state_version": 1,
  "blocks": ["main"],
  "actions": [
    {
      "id": "submit_message",
      "label": "Post message",
      "verb": "write",
      "target": "/post",
      "transport": { "method": "POST" },
      "input_schema": {
        "type": "object",
        "required": ["message"],
        "properties": {
          "message": { "type": "string" }
        },
        "additionalProperties": false
      },
      "state_effect": {
        "response_mode": "page"
      }
    }
  ],
  "allowed_next_actions": ["submit_message"]
}
```

This is the executable contract that the returned artifact will carry in its
embedded `mdan` block.

## 4. Build The Server

Create `app.ts`:

```ts
import { readFileSync } from "node:fs";
import { createMdanServer } from "@mdanai/sdk/server";

const template = readFileSync(new URL("./app/index.md", import.meta.url), "utf8");
const baseActions = JSON.parse(
  readFileSync(new URL("./app/actions/main.json", import.meta.url), "utf8")
);

function createSurface(messages: string[]) {
  const stateVersion = messages.length + 1;
  const stateId = `starter:home:${stateVersion}`;
  const list = messages.length > 0 ? messages.map((line) => `- ${line}`).join("\n") : "- No messages yet";

  return {
    markdown: `---\nroute: \"/\"\napp_id: \"starter\"\nstate_id: \"${stateId}\"\nstate_version: ${stateVersion}\n---\n\n${template}\n\n${list}`,
    actions: {
      ...baseActions,
      state_id: stateId,
      state_version: stateVersion
    },
    route: "/",
    regions: {
      main: list
    }
  };
}

export function createAppServer() {
  const messages = ["Welcome to MDAN"];
  const server = createMdanServer();

  server.page("/", async () => createSurface(messages));

  server.post("/post", async ({ inputs }) => {
    const message = String(inputs.message ?? "").trim();
    if (message) {
      messages.unshift(message);
    }
    return createSurface(messages);
  });

  return server;
}
```

This returns the next readable surface after each action instead of building a
separate JSON API.

## 5. Host It Locally

Create `dev.ts`:

```ts
import { createHost } from "@mdanai/sdk/server/bun";
import { createAppServer } from "./app.js";

const port = 4321;
const server = createAppServer();
const host = createHost(server, {
  browserShell: {
    title: "Starter App",
    moduleMode: "local-dist"
  }
});

Bun.serve({
  port,
  fetch: host
});
```

## 6. Run It

From the repository root:

```bash
npm install
npm run build
node scripts/run-example-dev.mjs dev.ts
```

If you are working in a generated Bun app, `bun start` is enough.

## 7. Check Both Read Paths

Browser projection:

```bash
curl -H 'Accept: text/html' http://127.0.0.1:4321/
```

Canonical Markdown surface:

```bash
curl -H 'Accept: text/markdown' http://127.0.0.1:4321/
```

POST action:

```bash
curl -X POST \
  -H 'Accept: text/markdown' \
  -H 'Content-Type: application/json' \
  -d '{"action":{"proof":"<proof>"},"input":{"message":"hello"}}' \
  http://127.0.0.1:4321/post
```

Use the real `action_proof` from the current artifact when action proof is
enabled.

## 8. What To Read Next

- [Application Structure](/application-structure)
- [Server Integration](/server-integration)
- [Runtime Contract](/guides/runtime-contract)
- [Surface Contract](/spec/surface-contract)
