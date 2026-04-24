---
title: Server Behavior
description: Practical guide to how the MDAN server runtime handles routes, response representations, action requests, post-action results, and runtime validation.
---

# Server Behavior

Use this page when your question is about what the server does at runtime.

Typical questions:

- what kinds of routes exist
- what response representations the server returns
- what an action request should look like
- what happens after an action runs
- what validation the runtime enforces

This page describes the practical behavior of `createMdanServer()`.

If your question is about browser continuation behavior, use
[Browser Behavior](/browser-behavior).

## Runtime Shape

The runtime has two route families:

- page routes, registered with `server.page(path, handler)`
- action routes, registered with `server.get(path, handler)` or
  `server.post(path, handler)`

Page handlers may return a Markdown-native page, a readable surface shape, or
`null`.

Action handlers may return a Markdown-native action result, a readable surface
shape, or a stream result from `stream(...)`.

Readable surface results are the lighter-weight default authoring shape:

- `markdown`
- `actions`
- `route`
- `regions`

## Response Representations

The runtime negotiates the response representation from `Accept`:

- `text/markdown`
  canonical page/action read surface
- `text/html`
  only for page `GET` requests when a browser shell host is involved
- `text/event-stream`
  only for stream action results
Practical rule:

- page read: prefer `text/markdown`
- ordinary action result: prefer `text/markdown`
- stream action: use `text/event-stream`
- do not request `text/html` from a normal action POST

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

## Handler Context

Action handlers receive:

- `request`
- `inputs`
- `inputsRaw`
- `session`
- `params`
- `readAsset(assetId)`
- `openAssetStream(assetId)`

Page handlers receive:

- `request`
- `session`
- `params`

## What Happens After An Action

An action result may return a new page or a region update depending on the
declared `state_effect`:

- `response_mode: "page"`
  replaces the current page snapshot
- `response_mode: "region"`
  patches only the declared `updated_regions` when possible

If the route changes or expected region data is missing, the runtime falls back
to page replacement.

Server-side auto dependencies are resolved before responses are sent, so
Markdown surfaces, HTML projections, and browser clients observe the same final
state.

## Runtime Validation

The runtime validates returned results before sending them:

- page and action handlers must return supported result shapes
- action contracts must pass `assertActionsContractEnvelope`
- agent blocks must be balanced and valid
- semantic slots are enforced when `semanticSlots` is configured
- action proof is signed on outgoing actions and verified on incoming actions by
  default

Use `actionProof: { disabled: true }` only for tests, demos, or trusted local
experiments.

## Practical Rule

Think of the server runtime as the owner of:

- route semantics
- representation negotiation
- action request validation
- result interpretation
- final response shaping

Do not re-implement those semantics in middleware or frontend assumptions.

## Related Docs

- [Custom Server](/custom-server)
- [Auto Dependencies](/auto-dependencies)
- [Browser Behavior](/browser-behavior)
- [Error Model And Status Codes](/spec/error-model)
- [MDAN Action Proof](/spec/action-proof)
