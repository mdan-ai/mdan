---
title: Browser Behavior
description: Practical guide to how browsers continue from an MDAN surface, including browser shell delivery, headless host behavior, action submission, region updates, and browser-side error handling.
---

# Browser Behavior

Use this page when your question is about how browsers continue from an MDAN
surface after the initial page load.

Typical questions:

- what the browser shell does
- when `@mdanai/sdk/surface` is involved
- how browser actions are submitted
- how region updates work in the browser
- how browser-side errors are represented

If your question is about server-side routing, request shape, or response
negotiation, use [Server Behavior](/server-behavior).

## The Two Browser Layers

The SDK has two browser-facing layers:

- `@mdanai/sdk/surface`
  the headless runtime that owns transport, route state, action submission, and
  region patching
- an internal shipped default UI implementation
  used by the browser shell

Custom frontends should depend on `@mdanai/sdk/surface` directly.

## Browser Shell

App hosts can enable `browserShell` for page document requests:

```ts
const app = createApp({
  browserShell: {
    title: "MDAN Starter"
  }
});
```

For `GET` requests that negotiate `text/html`, the host returns a readable HTML
projection of the current surface.

Today that means:

- page reads render server-side HTML from the current surface
- the default host path sets `hydrate: false`
- browsers can get a readable page without booting a custom frontend runtime

## Local Browser Assets

When you render a hydrated browser shell directly, browser modules load from CDN
URLs by default.

For local SDK development you can use:

```ts
browserShell: {
  moduleMode: "local-dist"
}
```

In `local-dist` mode, host adapters serve:

- `/__mdan/browser-shell.js`
- `/__mdan/surface.js`
- `/__mdan/ui.js`

from `dist-browser/`.

## Headless Host

`createHeadlessHost()` accepts an optional initial Markdown response, an initial
route, an optional `fetchImpl`, and `debugMessages`.

The host exposes:

- `mount()`
- `unmount()`
- `subscribe(listener)`
- `getSnapshot()`
- `visit(target)`
- `sync(target?)`
- `submit(operation, values)`

The snapshot contains the current Markdown, blocks, route, loading/error
status, and the current transition state.

## Browser Action Submission

POST actions are submitted with JSON request bodies by default:

```json
{
  "action": {
    "proof": "<server-issued proof>"
  },
  "input": {
    "message": "hello"
  }
}
```

The headless host requests `Accept: text/markdown` for both page reads and
ordinary action results, so the returned body is the same Markdown contract an
agent or curl client would read directly.

If any submitted value is a `File`, the host sends multipart form data and
includes `action.proof` as a form field.

GET actions submit values through the query string. When an operation carries an
action proof, the query includes `action.proof` too.

## Region Updates

For action results with `state_effect.response_mode: "region"`, the headless
host patches only the named `updated_regions` when possible.

If the returned surface changes route, or the expected region is absent, the
host falls back to a page replacement.

## Browser Error State

Non-2xx responses move the host into `error` status.

If the response body is readable Markdown, the host adapts it so the UI can
show the server-provided error content.

Responses that are not readable Markdown are treated as runtime errors for
browser clients.

## Debug Messages

Enable browser-side transport inspection with:

```ts
const host = createHeadlessHost({
  debugMessages: true
});
```

Debug records are stored in `window.__MDAN_DEBUG__.messages`.

## Practical Rule

Think of browser behavior as the layer that:

- continues from the current surface
- submits declared actions
- applies returned page or region updates
- preserves browser navigation state
- surfaces readable server-provided errors

It should not invent its own parallel action model.

## Related Docs

- [Server Behavior](/server-behavior)
- [Custom Rendering](/custom-rendering)
- [Troubleshooting](/troubleshooting)
