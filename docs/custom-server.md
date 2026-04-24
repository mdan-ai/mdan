---
title: Custom Server
description: Run MDAN on your own Node or Bun server stack, and understand when to use the high-level host helpers versus the lower-level runtime listener.
---

# Custom Server

Use this page when you want to keep MDAN server behavior but control how it
attaches to your HTTP server.

This is the server-side counterpart to [Custom Rendering](/custom-rendering).

Choose this path when:

- you want MDAN to run inside your own Node or Bun server entry
- you need to control request handling around the MDAN runtime
- you want to understand which HTTP responsibilities belong to MDAN and which
  belong to the host adapter

If you just want the normal app path, stay on the default starter setup.

## What You Keep And What You Customize

With a custom server:

- `createMdanServer()` still owns MDAN route semantics, action validation,
  representation negotiation, session intent handling, and final result shaping
- your host integration owns the surrounding HTTP server setup and decides how
  MDAN connects to real requests

In short:

- MDAN still owns application behavior
- your server entry owns transport integration

## When To Choose This Path

Choose custom server work when:

- you already have an existing server process
- you want to choose between Node and Bun hosting explicitly
- you need lower-level control than the starter's default host wiring
- you need to understand browser shell serving, form bridging, or body limits

Do not choose it just because you want to change page content or action logic.
That is normal app authoring, not custom server work.

## The Main Building Blocks

The runtime lives in:

```ts
import { createMdanServer } from "@mdanai/sdk/server";
```

The normal host adapters live in:

```ts
import { createHost } from "@mdanai/sdk/server/node";
import { createHost as createBunHost } from "@mdanai/sdk/server/bun";
```

The lower-level Node listener lives in:

```ts
import { createNodeRequestListener } from "@mdanai/sdk/server/node";
```

## The Recommended Path

For most custom server work, the recommended path is:

1. create the MDAN runtime once
2. attach it with the high-level host helper
3. let the host adapter manage browser-facing conveniences

Node example:

```ts
import http from "node:http";
import { createMdanServer } from "@mdanai/sdk/server";
import { createHost } from "@mdanai/sdk/server/node";

const server = createMdanServer({
  session: {
    secret: process.env.MDAN_SESSION_SECRET
  }
});

http.createServer(
  createHost(server, {
    browserShell: {
      title: "My MDAN App"
    }
  })
).listen(3000);
```

Bun example:

```ts
import { createMdanServer } from "@mdanai/sdk/server";
import { createHost } from "@mdanai/sdk/server/bun";

const server = createMdanServer();

Bun.serve({
  port: 3000,
  fetch: createHost(server)
});
```

That is the normal path when you want a real browser-facing MDAN app without
re-implementing host semantics yourself.

## High-Level Host Vs Lower-Level Listener

Use the high-level host when you want:

- browser shell serving
- static file or mount serving
- browser form bridging
- body normalization for JSON, URL-encoded forms, multipart forms, and files
- local browser bundle serving when the shell uses `moduleMode: "local-dist"`

Use the lower-level Node listener when you intentionally want less host
behavior and only need the runtime attached to raw Node requests.

That lower-level path does not add browser shell serving, root redirects,
favicon handling, or browser form adaptation by itself.

## What The Runtime Owns

`createMdanServer()` owns:

- page and action route semantics
- `Accept` negotiation
- action proof verification and signing
- action request validation
- session mutation intents
- final Markdown, HTML, JSON, or SSE response shaping

That means your custom server should not try to re-implement MDAN protocol
rules in middleware.

## What The Host Adapter Owns

The host adapter owns:

- reading request bodies
- parsing cookies into `request.cookies`
- normalizing form bodies into runtime-friendly JSON-compatible inputs
- enforcing body size limits
- serving optional browser shell and local browser bundles
- adapting no-JavaScript browser form submissions
- writing string or streaming responses back to the underlying transport

That split is the important mental model: the runtime decides what MDAN means,
the host adapter decides how HTTP requests reach it.

## Forms, Files, And Browser Apps

This path matters most when your app is browser-facing.

The high-level host can:

- turn browser form submissions into runtime action requests
- normalize `multipart/form-data` and file uploads
- serve the browser shell for page document requests
- keep no-JavaScript form submissions aligned with the same action handlers used
  by headless browser clients

If you bypass the high-level host, you usually need to understand those
capabilities before rebuilding them.

## Relationship To Custom Rendering

`Custom Server` and `Custom Rendering` solve different problems:

- `Custom Server` changes how MDAN attaches to HTTP
- `Custom Rendering` changes how the browser UI is rendered

You can use either one independently, or both together.

Typical combinations:

- default browser shell + custom server
- custom rendering + normal host adapter
- custom rendering + custom server

## Practical Rule

When you are choosing the server integration path:

- start with `createHost()` on Node or Bun
- stay on the high-level host unless you have a clear reason to drop lower
- treat `createMdanServer()` as the owner of MDAN behavior
- treat the host adapter as the owner of HTTP integration details

## Related Docs

- [Custom Rendering](/custom-rendering)
- [Server Behavior](/server-behavior)
- [SDK Packages](/sdk-packages)
- [API Reference](/api-reference)
- [Server Host Adapters](/reference/server-adapters)
