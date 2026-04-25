---
title: Server Host Adapters
description: Deep reference for the MDAN Node and Bun host adapters, including request normalization, markdown transport defaults, static serving, and host-level transport details.
---

# Server Host Adapters

Use this page as a deep reference after reading
[Custom Server](/custom-server).

The server runtime is transport-neutral. Host adapters connect a
`createMdanServer()` instance to Node or Bun HTTP servers.

This page is for the lower-level details:

- what each host helper actually adds
- how request bodies are normalized
- what static serving behavior the host owns
- how the adapter defaults requests into the markdown runtime contract

## Export Paths

Node:

```ts
import { createHost, createNodeRequestListener } from "@mdanai/sdk/server/node";
```

Bun:

```ts
import { createHost } from "@mdanai/sdk/server/bun";
```

Shared runtime modeling stays in:

```ts
import { createMdanServer, stream } from "@mdanai/sdk/server";
```

## Runtime Boundary

The runtime owns:

- routing for `server.page()`, `server.get()`, and `server.post()`
- Accept negotiation
- readable surface validation
- action proof verification and signing
- handler context creation
- session commits and clears
- response serialization

The host adapter owns:

- reading HTTP request bodies
- parsing cookies into `request.cookies`
- normalizing form bodies into JSON-compatible runtime bodies
- enforcing host-level body size limits
- serving optional static files
- writing string or streaming response bodies to the runtime-specific transport

## Request Normalization

Adapters convert runtime-specific HTTP objects into `MdanRequest`.

Only `GET` and `POST` are passed to the runtime. Other HTTP methods are
normalized to `GET` by the current adapters.

If the incoming request has no `Accept` header, adapters default it to
`text/markdown`.

## Form Body Normalization

Host adapters normalize browser form encodings into JSON-compatible request
bodies:

- `application/x-www-form-urlencoded` becomes a JSON input body
- `multipart/form-data` becomes a JSON input body
- file fields become serializable asset handles when asset storage is configured

After normalization, the runtime sees `Content-Type: application/json` for
form-encoded bodies that became JSON.

## Static Files

High-level hosts can serve explicit static files and mounted directories.

Static content types are inferred from common extensions. Unknown extensions use
`application/octet-stream`.

## Root Redirect And Favicon

High-level hosts support:

```ts
createHost(server, {
  rootRedirect: "/login",
  frontend: true,
  ignoreFavicon: true
});
```

`rootRedirect` returns `302` from `/` to the configured target before the
runtime is called.

`frontend: true` enables the built-in browser entry and bundled frontend assets
for natural HTML document routes such as `/login`, while the matching raw
markdown route remains available as `/login.md`.

If you want a custom browser frontend module, point the host at a browser-safe
module file:

```ts
createHost(server, {
  frontend: {
    module: "/abs/path/to/frontend.js"
  }
});
```

`ignoreFavicon` defaults to enabled. Requests to `/favicon.ico` return `204`
unless `ignoreFavicon: false` is set.

## Practical Rule

Treat this page as an adapter reference, not as your first server guide.

- start with [Custom Server](/custom-server)
- use `createHost()` unless you clearly need lower-level control
- come back here when you need exact host behavior details

## Related Docs

- [Routing](/routing)
- [Custom Server](/custom-server)
- [Server Behavior](/server-behavior)
- [Browser Behavior](/browser-behavior)
- [SDK Packages](/sdk-packages)
