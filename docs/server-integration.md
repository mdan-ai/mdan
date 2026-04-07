---
title: Server Integration
description: Integrate MDAN into an existing Express, Hono, Fastify, Koa, or Next backend without rebuilding runtime behavior yourself.
---

# Server Integration

This page is for the case where you already have a backend and want to plug MDAN into it without rebuilding the runtime yourself.

The short version is: do a thin HTTP adaptation layer, then let the runtime handle the real work.

## Integration Boundary

Keep the boundary clear:

- the framework layer only adapts transport details
- the MDAN runtime handles routing, negotiation, body semantics, and action execution

In practice, that means adapting requests and responses to `server.handle()`, not re-implementing MDAN logic in middleware or controllers.

## A Typical Adapter Shape

Reference: [examples/express-starter/app/express-adapter.ts](../examples/express-starter/app/express-adapter.ts)

Using Express as an example, the adapter only needs to do a few things:

- normalize headers into a lowercase key map
- parse cookies from the framework cookie map or `cookie` header
- normalize incoming form submissions into the runtime's direct-write field format with `serializeMarkdownBody`
- pass runtime headers and body back through unchanged

So the adapter is only translating the framework world into a runtime request, then translating the runtime result back into a framework response.

## How The App Registers Operations

Reference: [examples/express-starter/app/server.ts](../examples/express-starter/app/server.ts)

Application-side action registration should stay explicit:

- `target`
- `methods`
- `routePath`
- `blockName`
- `handler`

Do not infer bindings from what the page currently renders. What the page declares and what the server registers should line up directly.

## HTTP Semantics You Need To Preserve

- browser form submissions may arrive as `application/x-www-form-urlencoded`
- file uploads may arrive as `multipart/form-data`
- runtime-native direct-write requests may use `Content-Type: text/markdown`
- malformed Markdown bodies return `400`
- unsupported direct-write media types return `415`
- unacceptable representations return `406`

You do not need to manually handle these rules in every business handler, but the adaptation layer must not lose them.

## Adapter Checklist

- the request URL must be absolute, including host and protocol
- method, body, headers, and cookies should only be normalized once
- `set-cookie` returned by the runtime must be preserved
- streaming responses should be forwarded incrementally instead of buffered into JSON

## Common Pitfalls

- forgetting that browsers, file uploads, and agent requests may use different body encodings for the same input semantics
- overwriting the `content-type` already set by the runtime
- dropping `set-cookie` on the way out
- adding a second routing layer in the adapter and slowly drifting away from real runtime behavior

## Related Docs

- [HTTP Content Negotiation](/docs/shared-interaction)
- [Server Runtime](/docs/server-runtime)
- [Application Structure](/docs/application-structure)
