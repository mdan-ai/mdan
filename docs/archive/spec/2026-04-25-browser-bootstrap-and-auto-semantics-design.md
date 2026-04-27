# Browser Bootstrap And Auto Semantics

Date: 2026-04-25

## Problem

The SDK currently has three distinct needs that are not modeled separately enough:

1. Static auto dependencies
2. Dynamic auto dependencies
3. Browser-first initialization on the first frontend entry request

Today, dynamic auto is carrying too much semantic weight. It is used both as:

- a general-purpose runtime GET dependency hook
- a workaround for browser-only first-load behavior

That creates three problems:

- frontend entry has to smuggle browser intent into runtime through ad hoc request details
- app authors have to understand internal browser-entry fetch behavior
- dynamic auto feels broader and less principled than it should

Separately, recent debugging showed a second structural issue: server serialization was inlining region content back into page markdown, which mixed projection behavior into the server surface pipeline. That issue has now been corrected and should not be reintroduced.

This spec defines a cleaner separation:

- `static auto` remains the default dependency mechanism
- `dynamic auto` remains available, but is explicitly scoped as an advanced runtime request override
- `browser bootstrap` becomes a first-class browser-only initialization model

## Goals

- Make browser first-load behavior a first-class SDK concept
- Remove the need for app code to invent custom headers or internal bridge conventions
- Keep agent-facing markdown routes free from browser-only bootstrap behavior
- Narrow dynamic auto to a clear, defensible responsibility
- Preserve compatibility for existing auto users while establishing a better recommended path

## Non-Goals

- Replacing static auto
- Removing dynamic auto
- Expanding markdown rendering rules in this spec
- Redesigning frontend custom rendering APIs

Those areas may be touched by future work, but they are not the primary scope here.

## Current Model

### Static Auto

An operation participates in auto dependency resolution when:

- `method === "GET"`
- `auto === true`

Runtime then internally dispatches that GET dependency before returning the final page or fragment result.

This is the right model for fixed-target dependency resolution.

### Dynamic Auto

Current dynamic auto is implemented through:

- `auto.resolveRequest(context)`

It can override how the internal GET request is built.

Current context is:

- `action`
- `blockName`
- `sourceRequest`
- `session`

Current guarantees are:

- same-origin only
- GET only
- optional fallback to the static target

This is a reasonable low-level mechanism, but it is currently also being used to express browser-only initialization, which is not its real semantic purpose.

### Browser Entry

Frontend entry currently performs the initial browser fetch and runtime sync, but browser intent is not modeled as a formal SDK protocol concept. That makes the first document request feel too implicit and forces apps to reason about internal entry/runtime bridging.

## Proposed Model

The SDK should explicitly define three layers.

### 1. Static Auto

Static auto remains the default and recommended dependency mechanism.

Use static auto when:

- the target request is a normal GET dependency
- the target URL is known statically
- browser and agent semantics should be identical

This should remain the main path described in docs for most apps.

### 2. Dynamic Auto

Dynamic auto stays in the SDK, but its role is narrowed and documented more clearly.

Dynamic auto should be treated as:

**an advanced runtime request override for auto GET dependencies**

Use dynamic auto when:

- auto is still the right model
- the dependency is still a general runtime GET dependency
- but the actual internal request must be computed from runtime state

Examples:

- tenant-specific GET targets
- session-derived GET targets
- request-path-derived internal GET targets

Dynamic auto should no longer be the recommended solution for browser-only first-load initialization.

### 3. Browser Bootstrap

Browser bootstrap becomes a distinct model.

Browser bootstrap is:

- browser-only
- first-entry-only
- runtime-managed
- not part of the normal agent-facing markdown route semantics

Use browser bootstrap when:

- the behavior should happen only when a human browser opens the app
- the behavior should not affect agent markdown consumption
- the initialization depends on browser environment or browser-only experience

Examples:

- location-based initial route or weather lookup
- login/session recovery
- permission-driven onboarding or first-load guidance
- restoring browser-specific local state

## Semantic Split

The key split is:

- `auto` is about dependency resolution inside the surface graph
- `browser bootstrap` is about first browser entry initialization

These are different concerns and should not share the same top-level mental model.

## SDK-Owned Browser Intent Bridge

The browser entry flow should carry a formal SDK-owned signal indicating:

- this request comes from frontend entry
- this request is the first browser bootstrap read

This signal must be internal to the SDK.

App code should not:

- manually add custom headers
- manually distinguish document bootstrap from agent markdown reads
- understand frontend entry internals just to implement initialization behavior

### Requirement

Frontend entry should automatically attach an internal bootstrap intent marker on its first read/sync request.

Runtime should automatically recognize that marker.

The marker format is intentionally not fixed by this spec. It may be:

- an internal header
- a structured request metadata field
- another SDK-controlled transport detail

The important design constraint is:

**the bridge is SDK-owned, not app-authored**

## Browser Bootstrap API Shape

This spec does not lock a final API spelling, but the model should support an app-declared browser bootstrap hook.

Illustrative shapes:

```ts
createApp({
  browser: {
    bootstrap(context) { ... }
  }
});
```

or:

```ts
app.bootstrap(async (context) => { ... });
```

The chosen API should satisfy the following:

- clearly browser-specific
- clearly distinct from auto
- available at the app-facing layer
- does not require app code to know transport details

## Browser Bootstrap Result Shape

Browser bootstrap should return normal SDK result shapes:

- page result
- fragment result

It should not invent a second rendering system.

That keeps bootstrap aligned with the existing surface model and avoids introducing yet another parallel result channel.

## Dynamic Auto Contract Cleanup

Dynamic auto should be retained but documented as a narrow mechanism.

### Contract

Dynamic auto remains responsible only for computing the internal GET request for an auto dependency.

It should continue to:

- accept a request-construction context
- return a request-like GET override
- enforce same-origin
- enforce GET-only
- allow fallback to the static target

### Positioning

Docs should explicitly describe dynamic auto as:

- advanced
- lower-level
- not the preferred browser bootstrap path

### Optional Clarification

It may be useful to add an explicit internal reason field to the dynamic auto context, such as:

- `reason: "auto-dependency"`

This is not required for correctness, but it would make future runtime behavior easier to reason about and document.

## Interaction With Markdown Rendering

This spec does not redefine markdown rendering behavior, but it does establish one important boundary:

browser bootstrap should not depend on server-side content projection hacks.

That means:

- server surface output should remain protocol-correct
- server should not inline block regions back into page markdown to support bootstrap UX
- browser bootstrap should work through explicit surface results, not incidental markdown/HTML mixing

This is consistent with the recent serialization fix that restored block anchors in raw markdown and kept block content only in `regions`.

## Recommended Developer Guidance

Documentation should present these mechanisms in this order:

1. Use static auto first
2. Use browser bootstrap for first browser entry initialization
3. Use dynamic auto only when a runtime-computed auto GET request is genuinely needed

This ordering matters. It tells app authors that browser-first initialization is a first-class SDK path, not an advanced workaround.

## Compatibility

### Static Auto

No compatibility change required.

### Dynamic Auto

No behavior removal in the short term.

Existing apps using `auto.resolveRequest(...)` should continue to work.

However, docs should stop recommending dynamic auto for browser-first boot flows.

### Browser Bootstrap

This is additive.

Apps that currently use dynamic auto for browser first-load behavior can migrate incrementally.

## Migration Story

Current migration guidance should be:

- if the logic is a normal runtime GET dependency, keep it in static or dynamic auto
- if the logic is browser-first initialization only, move it to browser bootstrap

Typical migration targets:

- location-based initial lookup
- login recovery
- browser permission gated startup

## Testing Requirements

Implementation of this spec should add coverage for:

1. frontend entry first request carries SDK-owned browser bootstrap intent
2. agent markdown reads do not trigger browser bootstrap
3. browser bootstrap page result replaces the initial browser page correctly
4. browser bootstrap fragment result composes correctly with normal frontend rendering
5. static auto still behaves exactly as before
6. dynamic auto still behaves exactly as before for non-browser runtime dependency cases

## Recommended Implementation Order

1. Introduce SDK-owned browser bootstrap intent bridge
2. Add browser bootstrap runtime hook and result handling
3. Reposition dynamic auto in docs and API reference
4. Add migration guidance from browser-first dynamic auto to browser bootstrap

## Summary

The core cleanup is conceptual:

- static auto remains the default dependency mechanism
- dynamic auto remains available, but becomes an explicitly advanced runtime override
- browser bootstrap becomes the formal model for first browser entry initialization

That gives the SDK a cleaner mental model and removes the need for apps to understand or manually reconstruct the frontend-entry-to-runtime bridge.
