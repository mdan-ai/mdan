# Browser And Headless Runtime

The SDK has two browser-facing layers:

- `@mdanai/sdk/surface`: a lightweight headless runtime that owns transport, route
  state, action submission, region patching, and debug messages
- `@mdanai/sdk/ui`: the optional default Web Components UI

Custom frontends should depend on `@mdanai/sdk/surface` directly. The default UI is
for quick starts, examples, and hosts that want a complete browser experience
without writing rendering code.

## Browser Shell

Server hosts can enable `browserShell` for page document requests:

```ts
const server = createMdanServer({
  browserShell: {
    title: "MDAN Starter"
  }
});
```

For `GET` requests that negotiate `text/html`, the current runtime and host
path returns a readable HTML projection of the current artifact.

Today, that means:

- page reads render server-side HTML from the current artifact or page result
- the default host path sets `hydrate: false`
- browsers get a readable document without booting `createHeadlessHost()` or
  `mountMdanUi()`

The lower-level `renderBrowserShell()` helper can still render a hydrated shell
that imports `@mdanai/sdk/surface` and `@mdanai/sdk/ui`, but that is not the
default page-read path currently served by the runtime adapters.

## Module Modes

When you render a hydrated browser shell directly, it imports browser modules
from CDN URLs by default:

- `@mdanai/sdk/surface`
- `@mdanai/sdk/ui`

Local SDK development can use built browser artifacts instead:

```ts
browserShell: {
  moduleMode: "local-dist"
}
```

In `local-dist` mode, host adapters serve:

- `/__mdan/surface.js`
- `/__mdan/ui.js`

from `dist-browser/`. The example `dev:*` scripts build and watch those files.

## Headless Host

`createHeadlessHost()` accepts an optional initial Markdown artifact, an initial
route, an optional `fetchImpl`, and `debugMessages`.

The host exposes:

- `mount()` and `unmount()` for browser history listeners
- `subscribe(listener)` for UI rendering
- `getSnapshot()` for the current adapted snapshot
- `visit(target)` for page navigation
- `sync(target?)` for reloading the current route
- `submit(operation, values)` for action execution

The snapshot contains the current Markdown, blocks, route, loading/error
status, and the current transition state.

## Action Submission

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

The headless host now requests `Accept: text/markdown` for both page reads and
ordinary action results, so the returned body is the same artifact contract that
an agent or curl client would read directly.

If any submitted value is a `File`, the host sends multipart form data and
includes `action.proof` as a form field.

GET actions submit values through the query string. When an operation carries an
action proof, the query includes `action.proof` too.

## Region Updates

For action results with `state_effect.response_mode: "region"`, the headless host
patches only the named `updated_regions` when possible. If the returned surface
changes route, or the expected region is absent, the host falls back to a page
replacement.

## Error State

Non-2xx responses move the host into `error` status. If the response body is a
Markdown artifact or a legacy JSON surface, the host adapts it so the UI can
show the server-provided error content.

Responses that are neither readable Markdown artifacts nor legacy JSON surfaces
are treated as runtime errors for browser clients.

## Debug Messages

Enable browser-side transport inspection with:

```ts
const host = createHeadlessHost({
  debugMessages: true
});
```

Debug records are stored in `window.__MDAN_DEBUG__.messages` and include outgoing
requests and incoming surfaces. The default UI also exposes a small
debug drawer when debug messages are enabled.
