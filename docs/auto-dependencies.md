---
title: Auto Dependencies
description: How MDAN auto dependencies work today, when to stay on static auto, and when dynamic auto is the right advanced runtime override.
---

# Auto Dependencies

Use this page when your question is:

- how `auto: true` GET actions are executed
- when static auto is enough
- when dynamic auto is the right advanced override
- how auto differs from browser bootstrap

## Start With The Split

The recommended model is now:

- use static auto first for normal internal GET dependencies
- use browser bootstrap for first browser entry initialization
- use dynamic auto only when runtime state must compute the internal GET request

That split matters.

`auto` is about dependency resolution inside the surface graph.
`browser bootstrap` is about first browser entry initialization.

## Static Auto Is The Default

In the current runtime, an auto dependency is:

- a `GET` operation
- with `auto: true`

Runtime finds that operation and dispatches its internal GET target before
returning the final page or fragment result.

Use static auto when:

- the target is already known
- browser and agent semantics should stay the same
- you want a normal internal GET dependency, not browser-only setup

## Dynamic Auto Is An Advanced Override

Dynamic auto exists for the narrower case where auto is still the right model,
but the internal GET request must be computed at runtime.

At server level (`createMdanServer(...)`):

- `auto.maxPasses`
- `auto.resolveRequest(context)`
- `auto.fallbackToStaticTarget`

The older `autoDependencies` option name is still accepted. If both `auto` and
`autoDependencies` are provided, runtime merges them and `auto` wins for
overlapping fields.

At app level (`createApp(...)`):

- `auto.resolveRequest(context)`
- `auto.fallbackToStaticTarget`

Use dynamic auto when:

- the request URL depends on query, cookies, headers, or session
- the dependency is still a normal runtime GET dependency
- the target GET route still owns the real loading logic

Do not use dynamic auto as the default way to express browser-only first-load
behavior. That path now belongs to [Browser Bootstrap](/browser-bootstrap).

## Resolver Contract

`resolveRequest(context)` receives:

- `action`: the current auto GET operation
- `blockName`: the block where the auto dependency was found
- `sourceRequest`: the original request that led to this auto pass
- `session`: the session snapshot at this pass

Return:

- a request-like object to execute as the internal GET
- `null` or `undefined` to skip dynamic request construction for this pass

Fallback behavior:

- by default, `fallbackToStaticTarget !== false`, so `null` falls back to the
  static target
- if `fallbackToStaticTarget: false`, `null` means "do not dispatch this auto
  action"

## Runtime Guardrails

For dynamic resolver output, runtime enforces:

- same-origin URL
- method must be `GET`
- request shape must be valid
- `Accept` is forced to `text/markdown`
- auto GET request body is stripped, including POST-origin flows

These guardrails keep internal auto dispatch predictable and make dynamic auto a
request-construction hook, not a second routing system.

## Current Runtime Behavior

The current runtime resolves auto dependencies incrementally:

- runtime finds the first eligible auto GET operation in page or fragment blocks
- it resolves one auto dependency per pass
- if that result returns another page or fragment with another auto dependency,
  runtime may continue into another pass
- the loop stops when no auto dependency is found or `maxPasses` is reached

This is why `maxPasses` exists: it bounds fan-out and prevents accidental
infinite auto chains.

## Example: Runtime-Computed GET Target

```ts
import { createApp } from "@mdanai/sdk";

const app = createApp({
  auto: {
    resolveRequest({ action, sourceRequest }) {
      if (action.name !== "resolve_root") return null;

      const source = new URL(sourceRequest.url);
      const target = new URL(action.target, sourceRequest.url);
      const location = source.searchParams.get("location");

      if (location) {
        target.searchParams.set("location", location);
      }

      return {
        ...sourceRequest,
        method: "GET",
        url: target.toString()
      };
    }
  }
});
```

The important point is that the target route still owns the actual data-loading
behavior.

`auto.resolveRequest(...)` only decides how the internal GET is constructed.

## App Code Vs Runtime

App code owns:

- how source request data maps into the internal GET request
- what the target GET route does
- what page or fragment is returned

Runtime owns:

- finding eligible auto GET operations
- dispatching internal GET requests
- validating resolver output
- repeating passes up to the configured limit

## Practical Guidance

- prefer static auto first
- add dynamic auto only when runtime-computed GET construction is genuinely needed
- keep resolver logic deterministic and side-effect-free
- keep browser-first initialization in [Browser Bootstrap](/browser-bootstrap)

## Related Docs

- [Browser Bootstrap](/browser-bootstrap)
- [Browser Behavior](/browser-behavior)
- [API Reference](/api-reference)
- [Action Execution](/spec/action-execution)
