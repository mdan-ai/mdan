---
title: Server Behavior
description: Practical guide to the markdown-first MDAN server runtime, including route handling, action requests, result shaping, and validation.
---

# Server Behavior

Use this page when your question is about what the MDAN server runtime does.

The current runtime is markdown-first on the wire:

- page reads return `text/markdown`
- ordinary action results return `text/markdown`
- stream actions return `text/event-stream`
- host-level browser HTML projection is layered on top of that markdown surface
- app-level JSON API routes registered with `app.api(...)` return
  `application/json` outside the MDAN surface pipeline

## Runtime Shape

The runtime has two route families:

- page routes via `server.page(path, handler)`
- action routes via `server.get(path, handler)` and `server.post(path, handler)`

Page handlers may return a Markdown-native page, a readable surface shape, or
`null`.

Action handlers may return a Markdown-native action result, a readable surface
shape, or a stream result from `stream(...)`.

Readable surface results are the lighter-weight shape:

- `markdown`
- `actions`
- `route`
- `regions`

## Response Representations

The runtime negotiates from `Accept`:

- `text/markdown`
  the canonical surface for page reads and ordinary action results
- `text/event-stream`
  only for stream action results

Practical rule:

- page read: ask for `text/markdown`
- ordinary action result: ask for `text/markdown`
- stream action: ask for `text/event-stream`
- traditional JSON API: register a dedicated `app.api(...)` route
- do not ask action handlers to return `text/html`; browser HTML projection is
  a host concern built from the markdown surface

`Accept: application/json` is meaningful for JSON API routes. It is not the
MDAN surface representation for page or action routes.

For `app.api(...)`, the SDK defaults successful handler returns to JSON and
also accepts `json(body, options)` or `{ status, headers, body }`. Business
error shapes remain an application contract; the MDAN runtime only standardizes
the protocol errors it creates itself.

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

## What Happens After An Action

An action result may return a new page or a region update depending on the
declared `state_effect`:

- `response_mode: "page"`
  replaces the current page surface
- `response_mode: "region"`
  patches targeted regions when possible

For region actions, `updated_regions` is optional. When omitted, browser
continuation uses the block that submitted the action as the default region
target. Declare `updated_regions` when one action should update a different
block or multiple blocks.

If the route changes or expected region data is missing, browser continuation
falls back to page replacement.

Server-side auto dependencies are resolved before responses are sent, so all
markdown consumers observe the same final state.

## Runtime Validation

The runtime validates returned results before sending them:

- page and action handlers must return supported result shapes
- action contracts must pass contract validation
- agent blocks must be balanced and valid
- action proof is signed on outgoing actions and verified on incoming actions by
  default

Use `actionProof: { disabled: true }` only for tests, demos, or trusted local
experiments.

## Practical Rule

Think of the server runtime as the owner of:

- route semantics
- markdown-first representation negotiation
- action request validation
- result interpretation
- final response shaping

The frontend and host consume that returned markdown surface. If browser HTML
projection is enabled, the host may render readable HTML from it for document
page loads, but the runtime contract itself remains markdown-first.

## Related Docs

- [Custom Server](/custom-server)
- [Auto Dependencies](/auto-dependencies)
- [Browser Behavior](/browser-behavior)
- [Error Model And Status Codes](/spec/error-model)
- [MDAN Action Proof](/spec/action-proof)
