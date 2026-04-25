---
title: Custom Server
description: Run MDAN on your own Node or Bun server stack while keeping the runtime markdown-only on the wire.
---

# Custom Server

Use this page when you want to keep MDAN server behavior but control how it
attaches to your HTTP server.

Choose this path when:

- you want MDAN to run inside your own Node or Bun server entry
- you need to control request handling around the MDAN runtime
- you want lower-level control than the starter's default host wiring

## What You Keep And What You Customize

With a custom server:

- `createMdanServer()` still owns MDAN route semantics, action validation,
  representation negotiation, session intent handling, and final result shaping
- your host integration owns the surrounding HTTP server setup and decides how
  MDAN connects to real requests

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

## The Recommended Path

For most custom server work:

1. create the MDAN runtime once
2. attach it with the high-level host helper
3. let the host adapter manage body normalization, cookies, static files, and
   transport details

Node example:

```ts
import http from "node:http";
import { createMdanServer } from "@mdanai/sdk/server";
import { createHost } from "@mdanai/sdk/server/node";

const server = createMdanServer();

http.createServer(createHost(server)).listen(3000);
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

## What The Runtime Owns

`createMdanServer()` owns:

- page and action route semantics
- `Accept` negotiation
- action proof verification and signing
- action request validation
- session mutation intents
- final Markdown or SSE response shaping

The server no longer owns HTML projection.

## What The Host Adapter Owns

The host adapter owns:

- reading request bodies
- parsing cookies into `request.cookies`
- normalizing form bodies into runtime-friendly JSON-compatible inputs
- enforcing body size limits
- serving optional static files
- writing string or streaming responses back to the underlying transport

## Relationship To Custom Rendering

`Custom Server` and `Custom Rendering` solve different problems:

- `Custom Server` changes how MDAN attaches to HTTP
- `Custom Rendering` changes how the browser UI consumes markdown surfaces

## Related Docs

- [Custom Rendering](/custom-rendering)
- [Server Behavior](/server-behavior)
- [SDK Packages](/sdk-packages)
- [API Reference](/api-reference)
- [Server Host Adapters](/reference/server-adapters)
