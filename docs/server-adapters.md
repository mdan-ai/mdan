---
title: Server Host Adapters
description: Deep reference for the MDAN Node and Bun host adapters, including request normalization, browser form bridging, browser shell serving, and host-level transport details.
---

# Server Host Adapters

Use this page as a deep reference after reading
[Custom Server](/custom-server).

The server runtime is transport-neutral. Host adapters connect a
`createMdanServer()` instance to Node or Bun HTTP servers and add browser-facing
conveniences around the runtime.

This page is for the lower-level details:

- what each host helper actually adds
- how request bodies are normalized
- how browser form submissions are bridged
- what browser shell and static serving behavior the host owns

If you are still deciding whether you need this path at all, go back to
[Custom Server](/custom-server).

## Export Paths

Node:

```ts
import { createHost, createNodeRequestListener } from "@mdanai/sdk/server/node";
```

Bun:

```ts
import { createHost } from "@mdanai/sdk/server/bun";
```

Shared server modeling, handlers, sessions, assets, and result helpers stay in:

```ts
import { createMdanServer, stream } from "@mdanai/sdk/server";
```

## Read This Page When

Read this page when you need to answer questions like:

- what exactly does `createHost()` add on top of the runtime
- what do I lose if I drop down to `createNodeRequestListener()`
- how are forms, files, and browser HTML requests normalized
- which transport details belong to the host instead of the runtime

## Runtime Boundary

The runtime owns:

- routing for `server.page()`, `server.get()`, and `server.post()`
- Accept negotiation
- JSON surface validation
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
- serving the browser shell and local browser bundles
- adapting no-JavaScript browser form submissions
- writing string or streaming response bodies to the runtime-specific transport

That means this page is mostly about the host side of the boundary, not the
MDAN runtime semantics themselves.

## Node Helpers

`createNodeRequestListener(handler, options)` returns a low-level Node
`RequestListener`.

It performs request body reading, body normalization, cookie parsing, and
response writing. It does not add root redirects, favicon handling, static file
serving, local browser bundle serving, or browser form response adaptation.

`createHost(handler, options)` is the recommended Node entry for browser apps.
It wraps `createNodeRequestListener()` and adds the browser-facing host
behavior described below.

## Bun Helper

`createHost(handler, options)` returns a Bun-compatible request handler:

```ts
Bun.serve({
  fetch: createHost(server)
});
```

The Bun helper mirrors the high-level Node host behavior as closely as the Bun
runtime allows.

## Choosing The Right Level

Use `createHost()` when you want the normal browser-facing MDAN server path.

Use `createNodeRequestListener()` only when you intentionally want to attach the
runtime closer to raw Node HTTP and you are comfortable owning more of the
surrounding behavior yourself.

## Request Normalization

Adapters convert runtime-specific HTTP objects into `MdanRequest`:

```ts
type MdanRequest = {
  method: "GET" | "POST";
  url: string;
  headers: Record<string, string | undefined>;
  body?: string;
  cookies: Record<string, string>;
};
```

Only `GET` and `POST` are passed to the runtime. Other HTTP methods are
normalized to `GET` by the current adapters.

If the incoming request has no `Accept` header, adapters default it to
`text/markdown`.

Cookies are parsed from the incoming `Cookie` header and exposed through
`request.cookies`. Cookie signing, encryption, and persistence are application
or host concerns.

## Body Limits

Adapters enforce `maxBodyBytes` before the runtime sees a request body.

```ts
createHost(server, {
  maxBodyBytes: 2 * 1024 * 1024
});
```

If the raw body exceeds the limit, the host returns:

- status `413`
- Markdown content type
- body `## Payload Too Large`

The default limit is `1 MiB`.

## Form Body Normalization

Host adapters normalize browser form encodings into JSON-compatible request
bodies:

- `application/x-www-form-urlencoded` becomes a JSON input body
- `multipart/form-data` becomes a JSON input body
- file fields become serializable asset handles when asset storage is configured

After normalization, the runtime sees `Content-Type: application/json` for
form-encoded bodies that became JSON.

This keeps server handlers on the same `inputs` and `inputsRaw` contract whether
the request came from the headless host, a no-JavaScript browser form, or a
custom HTTP client.

## Browser Form Bridge

The high-level host detects no-JavaScript browser form action submissions:

- method is `POST`
- `Accept` includes `text/html`
- content type is `application/x-www-form-urlencoded` or `multipart/form-data`

For those requests, the host changes the runtime request to
`Accept: text/markdown` and adds `x-mdan-browser-form: true`.

Successful Markdown responses become `303` redirects to the resolved
route when one is available. Non-2xx responses become HTML browser shell
responses with the returned readable error content embedded.

This bridge lets native browser form submissions and JavaScript headless
submissions share the same action handlers.

## Browser Shell

When `browserShell` is configured, high-level hosts can serve the default HTML
shell for page document requests.

```ts
createHost(server, {
  browserShell: {
    title: "MDAN App"
  }
});
```

For HTML page reads, the host asks the runtime for a page response and writes
the resulting browser-facing HTML. In the current runtime path, page reads are
served as server-rendered Markdown projections without booting
`@mdanai/sdk/surface` or the shipped browser-shell bundles in the browser.

The lower-level `renderBrowserShell()` helper can still be used separately when
you want a hydrated shell, but high-level host adapters do not inject that
client runtime for ordinary page reads today.

See [Browser Behavior](/browser-behavior) for the browser client contract, and
[Custom Server](/custom-server) for the higher-level server integration path.

## Local Browser Bundles

When the browser shell uses local distribution mode:

```ts
browserShell: {
  moduleMode: "local-dist"
}
```

the host serves:

- `/__mdan/surface.js`
- `/__mdan/ui.js`

from `dist-browser/`.

These files are browser bundles served by the host. They are not general Node
import paths.

## Static Files

High-level hosts can serve explicit static files:

```ts
createHost(server, {
  staticFiles: {
    "/robots.txt": "./public/robots.txt"
  }
});
```

They can also serve mounted directories:

```ts
createHost(server, {
  staticMounts: [
    { urlPrefix: "/assets", directory: "./public/assets" }
  ]
});
```

Mounted files are resolved under the configured directory. Path traversal that
would escape the mount root is rejected by returning no mounted file match.

Static content types are inferred from common extensions. Unknown extensions use
`application/octet-stream`.

Node static responses include ETag support and may return `304`. Bun static
responses currently return the file bytes with cache headers.

## Root Redirect And Favicon

High-level hosts support:

```ts
createHost(server, {
  rootRedirect: "/app",
  ignoreFavicon: true
});
```

`rootRedirect` returns `302` from `/` to the configured target before the
runtime is called.

`ignoreFavicon` defaults to enabled. Requests to `/favicon.ico` return `204`
unless `ignoreFavicon: false` is set.

## HTML Transform

Adapters accept an optional `transformHtml(html)` hook.

The hook is applied only to string responses with `Content-Type: text/html`.
It can be used for local development injection, analytics snippets, CSP nonce
insertion, or host-specific wrapping.

## Practical Rule

Treat this page as an adapter reference, not as your first server guide.

- start with [Custom Server](/custom-server)
- use `createHost()` unless you clearly need lower-level control
- come back here when you need exact host behavior details

## Related Docs

- [Custom Server](/custom-server)
- [Server Behavior](/server-behavior)
- [Browser Behavior](/browser-behavior)
- [SDK Packages](/sdk-packages)

Do not use `transformHtml` to change the JSON surface contract. Surface
validation happens before HTML is written.

## Streaming Responses

Runtime responses may have an async iterable body, especially for
`text/event-stream`.

Node writes each chunk with `response.write()` and ends the response after the
iterable finishes. Bun converts the async iterable into a `ReadableStream`.
