---
title: Server Development
description: Integrate MDSN server runtime with your own backend stack.
---

# Server Development

Use this path when you already have a backend framework and need to integrate MDSN safely.

## Integration Model

- Keep business logic in your app modules
- Use `createHostedApp()` or `createMdsnServer()` for protocol runtime
- Bridge framework requests into `server.handle()`

## Express Example

See:

- [examples/express-starter/src/express-adapter.ts](/Users/hencoo/projects/mdsn/examples/express-starter/src/express-adapter.ts)
- [examples/express-starter/src/index.ts](/Users/hencoo/projects/mdsn/examples/express-starter/src/index.ts)

## Critical Behaviors

- POST write requests use `Content-Type: text/markdown`
- malformed Markdown body -> `400`
- wrong write media type -> `415`
- unsupported `Accept` -> `406`

For negotiation details, see [Shared Interaction](/docs/shared-interaction).

## Adapter Checklist

- Normalize incoming method/url/headers/body.
- Pass cookies into `request.cookies`.
- Forward `status/headers/body` from runtime response unchanged.
- Avoid shadow routing logic in adapter.

## Common Pitfalls

- Treating `application/x-www-form-urlencoded` as direct runtime write body.
- Dropping `set-cookie` from runtime response headers.
- Re-serializing runtime markdown body as JSON.
