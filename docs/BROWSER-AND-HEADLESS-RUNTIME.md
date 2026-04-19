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

For `GET` requests that negotiate `text/html`, the host renders a browser shell:

- readable HTML from the current JSON surface
- an embedded bootstrap JSON surface
- `createHeadlessHost({ initialSurface })`
- `mountMdanUi({ root, host })`

When the initial surface is embedded, the browser does not fetch the same page a
second time on startup.

## Module Modes

By default, the shell imports browser modules from CDN URLs:

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

`createHeadlessHost()` accepts an initial surface, an initial route, an optional
`fetchImpl`, and `debugMessages`.

The host exposes:

- `mount()` and `unmount()` for browser history listeners
- `subscribe(listener)` for UI rendering
- `getSnapshot()` for the current adapted snapshot
- `visit(target)` for page navigation
- `sync(target?)` for reloading the current route
- `submit(operation, values)` for action execution

The snapshot contains the current Markdown, blocks, route, loading/error status,
and whether the last transition was `page`, `region`, or `stream`.

## Action Submission

POST actions are submitted as JSON by default:

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
JSON surface, the host still adapts it so the UI can show the server-provided
error content.

Responses that are not JSON surfaces are treated as runtime errors for browser
clients.

## Debug Messages

Enable browser-side transport inspection with:

```ts
const host = createHeadlessHost({
  debugMessages: true
});
```

Debug records are stored in `window.__MDAN_DEBUG__.messages` and include outgoing
requests and incoming surfaces. The default elements UI also exposes a small
debug drawer when debug messages are enabled.
