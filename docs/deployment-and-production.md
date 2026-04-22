---
title: Deployment And Production
description: Practical guidance for running an MDAN app in production with Node or Bun, reverse proxies, sessions, assets, and browser delivery.
---

# Deployment And Production

This guide focuses on practical production concerns for MDAN apps:

- how to run the app host
- how to place it behind a reverse proxy
- how to think about browser shell delivery
- how to handle sessions, uploads, and body limits

It is intentionally operational. For protocol rules, see the `spec/` docs.

## 1. Choose A Runtime Shape

For most deployments, the shape is:

- app/runtime code in `@mdanai/sdk/server`
- Node host via `@mdanai/sdk/server/node`
  or
- Bun host via `@mdanai/sdk/server/bun`

Choose Node when:

- your platform already standardizes on Node HTTP servers
- you want easier integration with existing Node deployment tooling

Choose Bun when:

- you already deploy Bun services
- you want the Bun-native `fetch` host path

## 2. Build Before Deploy

For the SDK workspace itself, the important build outputs are:

- `dist/`
- `dist-browser/`

Run:

```bash
npm install
npm run build
```

If your app depends on browser shell local bundles, make sure `dist-browser/`
is present before the process starts.

## 3. Run A Stable Host

Typical Node entry:

```ts
import { createServer } from "node:http";
import { createHost } from "@mdanai/sdk/server/node";

createServer(
  createHost(server, {
    browserShell: {
      title: "My App",
      moduleMode: "local-dist"
    }
  })
).listen(port);
```

Typical Bun entry:

```ts
import { createHost } from "@mdanai/sdk/server/bun";

Bun.serve({
  port,
  fetch: createHost(server, {
    browserShell: {
      title: "My App",
      moduleMode: "local-dist"
    }
  })
});
```

In production, prefer one long-lived process model with explicit health checks
and logging rather than ad hoc dev scripts.

## 4. Reverse Proxy Expectations

If you run behind Nginx, Caddy, Cloudflare, Fly.io, Railway, or another reverse
proxy:

- preserve the request method
- preserve request bodies unchanged
- preserve `Accept`
- preserve `Content-Type`
- preserve `Cookie`
- preserve streaming behavior for SSE endpoints

Do not let the proxy rewrite:

- `text/markdown` into another response type
- streaming responses into buffered JSON
- cookie headers out of responses

## 5. Browser Delivery Choices

For browser-facing apps, decide how the HTML projection should load browser
runtime assets.

### Local Dist Mode

Use:

```ts
browserShell: {
  moduleMode: "local-dist"
}
```

This is the best fit when:

- you deploy the app and its browser assets together
- you want predictable asset ownership from the same host

Make sure the host can serve:

- `/__mdan/surface.js`
- `/__mdan/ui.js`

### CDN Mode

Use the default mode when:

- you intentionally want browser modules resolved from CDN URLs
- you do not want the app host to serve local browser bundles

For the current runtime, ordinary browser page reads are still server-rendered
artifact projections. Do not assume that serving the browser bundles is
required for every browser request.

## 6. Static Files

If you need static assets, wire them through host options:

```ts
createHost(server, {
  staticFiles: {
    "/robots.txt": "./public/robots.txt"
  },
  staticMounts: [
    { urlPrefix: "/assets", directory: "./public/assets" }
  ]
});
```

Production advice:

- keep static mounts explicit
- avoid mounting broad writable directories
- put cache headers in front of truly static assets at the proxy/CDN layer when
  appropriate

## 7. Body Limits

The host enforces request body limits before runtime handling.

Set `maxBodyBytes` intentionally:

```ts
createHost(server, {
  maxBodyBytes: 2 * 1024 * 1024
});
```

Choose this based on:

- largest expected JSON action payload
- whether you accept file uploads
- upstream proxy limits

Keep proxy and app limits aligned so users do not get confusing mixed failures.

## 8. Sessions

MDAN does not prescribe a storage backend for sessions.

For production:

- keep session storage external to process memory when horizontal scaling matters
- sign or otherwise protect session cookies appropriately for your environment
- set cookie attributes intentionally:
  - `HttpOnly`
  - `SameSite`
  - `Secure` in HTTPS deployments
  - explicit `Path`

Do not rely on in-memory session maps if:

- you run multiple instances
- you restart frequently
- you need durable login state

## 9. Assets And Uploads

If you accept uploads, configure asset storage intentionally:

```ts
createMdanServer({
  assets: {
    rootDir: process.cwd(),
    ttlSeconds: 3600
  }
});
```

Production guidance:

- keep the asset root on storage you understand operationally
- validate MIME type and size in handlers
- clean up expired assets on a schedule
- do not expose local asset paths directly to clients

If uploads matter to the product, do not treat local disk as magically durable.

## 10. Streaming

If you expose SSE endpoints:

- make sure your reverse proxy does not buffer them aggressively
- preserve `text/event-stream`
- keep timeouts compatible with long-running streams

If your infra cannot preserve streaming semantics reliably, prefer returning a
normal Markdown artifact plus a follow-up polling/read action.

## 11. Logging And Observability

At minimum, log:

- request method and path
- response status
- content type for unusual failures
- session/auth boundary failures
- asset upload failures
- action-proof validation failures

Useful production questions to answer quickly:

- are clients asking for the wrong representation?
- are uploads hitting body limits?
- are sessions failing at read, commit, or clear?
- are proxies breaking SSE or cookies?

## 12. Production Checklist

- build outputs are generated before startup
- proxy preserves `Accept`, `Content-Type`, cookies, and streaming
- `maxBodyBytes` matches expected traffic
- session storage is suitable for your instance model
- asset cleanup is configured if uploads are enabled
- browser shell mode is chosen intentionally
- static file mounts are explicit
- logs capture runtime and transport failures

## Related Docs

- [Server Adapters](/reference/server-adapters)
- [Browser And Headless Runtime](/guides/browser-and-headless-runtime)
- [Inputs And Assets](/guides/inputs-and-assets)
- [Sessions](/guides/sessions)
- [Streaming](/guides/streaming)
