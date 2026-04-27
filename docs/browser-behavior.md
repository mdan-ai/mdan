---
title: Browser Behavior
description: Practical guide to how browsers continue from a markdown MDAN surface using the headless surface runtime and optional frontend helpers.
---

# Browser Behavior

Use this page when your question is about how browsers continue from an MDAN
surface after the initial fetch.

The key rule now is simple:

- the server returns `text/markdown`
- the browser consumes that markdown surface
- the host decides whether the natural browser route starts from a client
  projection shell or stays in readable HTML document projection

## The Two Browser Layers

The SDK has two browser-facing layers:

- `@mdanai/sdk/surface`
  the headless runtime that owns transport, route state, action submission, and
  region patching
- `@mdanai/sdk/frontend`
  the shipped frontend helpers that can render a surface snapshot and mount the
  default browser UI

Custom frontends should depend on `@mdanai/sdk/surface` directly.
Frontend integrations that only need a host contract can stay typed against
`@mdanai/sdk/frontend` contracts and pass in any structurally compatible host.

## Headless Host

`createHeadlessHost()` is the browser runtime entry.

The host exposes:

- `mount()`
- `unmount()`
- `subscribe(listener)`
- `getSnapshot()`
- `visit(target)`
- `sync(target?)`
- `submit(operation, values)`

The snapshot contains the current markdown, blocks, route, loading/error
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
ordinary action results, so the returned body is the same markdown contract a
curl client or agent would read directly.

If any submitted value is a `File`, the host sends multipart form data and
includes `action.proof` as a form field.

GET actions submit values through the query string. When an operation carries an
action proof, the query includes `action.proof` too.

## Frontend Rendering

If you want the shipped frontend layer, use `@mdanai/sdk/frontend`:

- `createFrontend(...)` as the main shipped-frontend object entry
- `defineFrontendModule(...)` when you want to pass a frontend object directly to `app.host(...)`
- `frontend.boot(...)` for the standalone browser entry
- `frontend.render(...)` for HTML projection from a surface view
- `frontend.mount(...)` for the interactive default UI
- `frontend.markdown` when you want custom Markdown projection
- `defineFormRenderer(...)` and `UiFormRenderer` for custom form panels
- `frontend.form` when you want custom form projection
- `frontend.setup` when you need mounted side effects such as observers,
  event listeners, timers, or browser-only bootstrap helpers
- `FrontendSnapshot`, `FrontendUiHost`, and `FrontendHostFactory` when you want
  to type your browser integration against the frontend contract instead of the
  concrete surface runtime

The recommended browser entry uses the natural browser route:

- `/`
- `/login`

By default, that entry boots browser code, then fetches the matching raw
markdown route:

- `/` -> `/index.md`
- `/login` -> `/login.md`

This is client projection mode. It keeps the initial HTML document small and
lets the frontend produce the visible UI from the markdown surface.

If you enable HTML projection, browser page flow stays document-oriented. The
host reads the same runtime surface, renders its readable markdown into the
HTML document body, and passes that initial markdown to the frontend:

```ts
app.host("bun", {
  frontend: true,
  browser: {
    projection: "html"
  }
});
```

In this mode, the server owns readable Markdown rendering for browser page
documents. The frontend uses the embedded action JSON/surface metadata to mount
the action layer, but it does not re-render the readable Markdown that the
server already projected.

The server does not expose `<!-- mdan:block -->` comments as visible HTML.
Instead, HTML projection emits stable DOM anchors:

```html
<section data-mdan-block="main">
  ...
  <div data-mdan-action-root data-mdan-block="main"></div>
</section>
```

The frontend keeps protocol state from the initial surface, then mounts each
block's action UI into the matching `data-mdan-action-root`. If a block-specific
anchor is missing, it falls back to a root-level action container.

Ordinary page `visit()` calls, syncs, and GET page actions use document
navigation so the next natural route is projected by the server again. Region
updates and POST actions continue to use the markdown surface protocol because
they are interaction continuation, not document page navigation; even there,
the HTML-projection UI keeps the server-rendered readable document in place and
only updates the action layer.

Use HTML projection for public, docs, or SEO-sensitive pages. Use the default
client projection when the browser runtime should own page continuation.

On that first browser-driven read, the frontend entry also attaches an
SDK-owned internal browser bootstrap intent marker. Runtime uses that signal to
decide whether a declared browser bootstrap hook should run before the normal
page handler.

That signal is internal to the SDK. App code should not invent custom headers
or transport conventions to distinguish browser entry from normal agent-facing
markdown reads.

If you define your frontend in its own browser module, you can now pass that
frontend object directly to the app-facing host path:

```ts
import { createFrontend, defineFrontendModule } from "@mdanai/sdk/frontend";

const frontend = defineFrontendModule(
  import.meta.url,
  createFrontend({
    form: weatherFormRenderer
  })
);

export default app.host("bun", {
  frontend
});
```

If you want full ownership, consume the headless snapshot yourself and render
with your own framework.

## Region Updates

For action results with `state_effect.response_mode: "region"`, the headless
host patches only the named `updated_regions` when possible.

If the returned surface changes route, or the expected region is absent, the
host falls back to a page replacement.

## Browser Error State

Non-2xx responses move the host into `error` status.

If the response body is readable markdown, the host adapts it so the UI can
show the server-provided error content.

Responses that are not readable markdown are treated as runtime errors for
browser clients.

## Related Docs

- [Browser Bootstrap](/browser-bootstrap)
- [Auto Dependencies](/auto-dependencies)
- [Routing](/routing)
- [Server Behavior](/server-behavior)
- [Custom Rendering](/custom-rendering)
- [Markdown Rendering](/markdown-rendering)
- [Form Rendering](/form-rendering)
- [Troubleshooting](/troubleshooting)
