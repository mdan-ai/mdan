---
title: Server Runtime
description: Responsibilities, entry points, and common usage of @mdsnai/sdk/server.
---

# Server Runtime

`@mdsnai/sdk/server` is the main entry point when you want to model an MDSN app on the server.

It registers and handles operations by the explicit HTTP paths written in the MDSN page.

## Basic Usage

```ts
import { composePage } from "@mdsnai/sdk/core";
import { createHostedApp } from "@mdsnai/sdk/server";

const server = createHostedApp({
  pages: {
    "/guestbook": pageHandler
  },
  actions: [
    {
      target: "/list",
      methods: ["GET"],
      routePath: "/guestbook",
      blockName: "guestbook",
      handler: listHandler
    },
    {
      target: "/post",
      methods: ["POST"],
      routePath: "/guestbook",
      blockName: "guestbook",
      handler: postHandler
    }
  ]
});
```

## Handler Shape

Handlers receive a context object that includes:

- parsed inputs
- framework-neutral request metadata
- current session state

If you use `createHostedApp()` directly, action handlers also receive:

- `routePath`
- `blockName`
- `page()`
- `block()`

The most common block operation can be written like this:

```ts
const page = composePage(source, {
  blocks: {
    guestbook: "## 2 live messages\n\n- Welcome\n- Hello"
  }
});

const server = createHostedApp({
  pages: {
    "/guestbook": () => page
  },
  actions: [
    {
      target: "/list",
      methods: ["GET"],
      routePath: "/guestbook",
      blockName: "guestbook",
      handler: ({ block }) => block()
    }
  ]
});
```

The runtime serializes that into a Markdown fragment ready to return.

`createHostedApp()` does not try to infer action bindings by rendering a page first and guessing from visible state. `actions` must explicitly declare `target / methods / routePath / blockName`, so registration stays stable.

Use `createHostedApp()` when your app is naturally a set of pages plus operations. Drop down to `createMdsnServer()` when you need full manual control.

## Request Bridge

If you want full control, your framework adapter only needs to call `server.handle()` with a neutral request shape:

```ts
const response = await server.handle({
  method: "POST",
  url: "https://example.com/login",
  headers: {
    accept: "text/markdown",
    "content-type": "text/markdown"
  },
  body: 'nickname: "guest", message: "hello"',
  cookies: {}
});
```

The returned object contains:

- `status`
- `headers`
- `body`

If you are on Node `http`, use the Node adapter:

```ts
import { createHost } from "@mdsnai/sdk/server/node";

http.createServer(
  createHost(server, {
    rootRedirect: "/guestbook",
    transformHtml: injectEnhancement,
    staticFiles: {
      "/starter/client.js": join(exampleRoot, "dist", "client.js")
    },
    staticMounts: [{ urlPrefix: "/sdk/", directory: join(repoRoot, "sdk") }]
  })
);
```

If you are on Bun, use the Bun adapter:

```ts
import { createHost } from "@mdsnai/sdk/server/bun";

Bun.serve({
  port: 3000,
  fetch: createHost(server, {
    rootRedirect: "/guestbook",
    transformHtml: injectEnhancement
  })
});
```

## Built-In Responsibilities

`@mdsnai/sdk/server` already handles:

- route matching by target
- GET query parsing
- POST Markdown body parsing
- `415 Unsupported Media Type` for non-Markdown direct POST writes
- recoverable `400` responses for malformed Markdown bodies
- Node `http` hosting when you use `@mdsnai/sdk/server/node`
- Bun hosting when you use `@mdsnai/sdk/server/bun`
- cookie forwarding into `request.cookies`
- session injection
- Markdown vs HTML negotiation
- fragment serialization
- `text/event-stream` negotiation for stream reads
- 404 and 406 fallback responses

## Custom Markdown Renderer

When the browser goes through the HTML path, `@mdsnai/sdk/server` renders Markdown into HTML. You can inject that renderer:

```ts
const server = createHostedApp({
  markdownRenderer: {
    render(markdown) {
      return marked.parse(markdown);
    }
  },
  pages,
  actions
});
```

If you also use the default `@mdsnai/sdk/elements` UI, pass the same `markdownRenderer` object to `mountMdsnElements(...)` so server-side and default UI rendering stay consistent.

## When To Wrap It

If you later want Express, Hono, or Next support, build that as a thin adapter around `server.handle()` instead of forking the runtime logic.
