---
title: Server Behavior
description: Practical guide to the markdown-only MDAN server runtime, including route handling, action requests, result shaping, and validation.
---

# Server Behavior

Use this page when your question is about what the MDAN server runtime does.

The current runtime is markdown-only on the wire:

- page reads return `text/markdown`
- ordinary action results return `text/markdown`
- stream actions return `text/event-stream`
- `text/html` is not a server response mode

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
- do not ask the server for `text/html`

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
  patches only the declared `updated_regions` when possible

If the route changes or expected region data is missing, the runtime falls back
to page replacement.

Server-side auto dependencies are resolved before responses are sent, so all
markdown consumers observe the same final state.

## Runtime Validation

The runtime validates returned results before sending them:

- page and action handlers must return supported result shapes
- action contracts must pass contract validation
- agent blocks must be balanced and valid
- semantic slots can be enforced as optional authoring lint when
  `semanticSlots` is configured
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

The frontend should consume the returned markdown surface. It should not expect
the server to pre-render HTML for it.

## Related Docs

- [Custom Server](/custom-server)
- [Auto Dependencies](/auto-dependencies)
- [Browser Behavior](/browser-behavior)
- [Error Model And Status Codes](/spec/error-model)
- [MDAN Action Proof](/spec/action-proof)
