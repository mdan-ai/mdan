# Runtime Contract

This document describes the server runtime behavior implemented by
`createMdanServer()`. The protocol shape itself remains in
`../spec/application-surface.zh.md`; this file is the practical SDK guide for
hosts, tests, and agents.

Related contract documents:

- `SERVER-ADAPTERS.md`: Node/Bun host adapter behavior
- `ERRORS.md`: status codes and error surface shape
- `STREAMING.md`: `stream(...)` and `text/event-stream`
- `UI-ACTION-SEMANTICS.md`: browser/default UI action behavior
- `PUBLIC-API.md`: package export boundaries

## Runtime Shape

The runtime has two route families:

- page routes, registered with `server.page(path, handler)`
- action routes, registered with `server.get(path, handler)` or
  `server.post(path, handler)`

Page handlers may return an artifact-native page, a readable surface shape, a
legacy JSON compatibility shape, or `null`. Action handlers may return an
artifact-native action result, a readable surface shape, that same legacy
compatibility shape, or a stream result from `stream(...)`.

Legacy JSON compatibility shapes are currently used as an internal bridge
while the runtime moves toward artifact-native handlers. The SDK projects them
into the canonical Markdown artifact shape before `text/markdown` responses are
serialized.

Readable surface results are the lighter-weight default authoring shape:

- `markdown`: page markdown template
- `actions`: the executable action contract
- `route`: the current route path
- `regions`: named region markdown used for block updates

For compatibility only, every legacy JSON compatibility shape contains:

- `content`: Markdown for humans and agents
- `actions`: the executable action contract
- `view.route_path`: the browser/history route for the returned surface
- `view.regions`: named region markdown used for block updates

For the full legacy envelope and action schema contract, see the archived
compatibility notes under `docs/archive/`.

## Representations

The runtime negotiates the response representation from `Accept`:

- `text/markdown` returns the canonical page artifact
- `text/html` is only for page `GET` requests when a browser shell host is in
  front of the runtime
- `text/event-stream` is only for stream action results
- `application/json` is only available for handlers that still expose the
  legacy JSON compatibility bridge

`text/markdown` is the recommended public read path for both page reads and
ordinary action results. `text/html` remains the browser projection for page
`GET` requests. The `application/json` representation remains available only as
a compatibility bridge while the runtime still supports legacy envelope paths.

Raw action submissions still use JSON request bodies, but ordinary action
results can now be returned as Markdown artifacts. A `POST` action with
`Accept: text/html` returns `406 Not Acceptable`; `Accept: text/markdown` is
the preferred non-stream action response.

See `STREAMING.md` for the stricter stream-action boundary and `ERRORS.md` for
status-code behavior.

## Action Request Format

Action proof is enabled by default. JSON action requests should use:

```json
{
  "action": {
    "proof": "<server-issued action proof>"
  },
  "input": {
    "field": "value"
  }
}
```

Form-style compatibility fields are also parsed:

```json
{
  "action.proof": "<server-issued action proof>",
  "field": "value"
}
```

See `ACTION-PROOF-SECURITY.md` for the security boundary and disable escape
hatch.

## Handler Context

Action handlers receive:

- `request`: normalized runtime request metadata
- `inputs`: schema-normalized values
- `inputsRaw`: submitted values before schema coercion
- `session`: the current session snapshot or `null`
- `params`: route parameters
- `readAsset(assetId)`: read an uploaded asset as a `Buffer`
- `openAssetStream(assetId)`: stream an uploaded asset

Page handlers receive:

- `request`
- `session`
- `params`

## Result Semantics

An action result may return a new page or a region update depending on the
declared action `state_effect`:

- `response_mode: "page"` replaces the current page snapshot and may update
  browser history using the returned route
- `response_mode: "region"` patches only the declared `updated_regions` when the
  returned route still matches the current route
- a route change or missing region data falls back to page replacement

Server-side auto dependencies are resolved before responses are sent, so the
compatibility JSON bridge, Markdown artifacts, HTML projections, and browser
clients observe the same final state.

`auto` is intentionally narrower than action execution:

- only `GET` operations can be projected as auto dependencies
- auto resolution runs inside the server runtime and does not consume client
  action proof
- external `POST` actions still require action proof by default
- hosts can cap implicit auto fan-out with `autoDependencies.maxPasses`

```ts
createMdanServer({
  autoDependencies: {
    maxPasses: 3
  }
});
```

## Validation

The runtime validates returned results before sending them:

- page handlers and action handlers may return artifact-native results or the
  readable surface / legacy JSON compatibility shapes
- action contracts must pass `assertActionsContractEnvelope`
- agent blocks must be balanced and valid
- semantic slots are enforced when `semanticSlots` is configured
- action proof is signed on outgoing actions and verified on incoming actions by
  default

Use `actionProof: { disabled: true }` only for tests, demos, or trusted local
experiments that intentionally bypass action execution proofing.

Validation failures are returned as runtime error surfaces. See `ERRORS.md` for
the exact status-code model.
