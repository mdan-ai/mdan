# SDK Surface Consolidation Plan

This document defines the intended end-state for the public SDK surface after
the current convergence work.

The goal is simple:

- app developers should start with one obvious package entry: `@mdanai/sdk`
- frontend customization should have one obvious escape hatch: `@mdanai/sdk/surface`
- everything else should either move behind those surfaces or be treated as a
  lower-level compatibility/runtime layer

## Product Goal

For a developer with normal web or backend experience, building an app should
not require understanding:

- protocol internals
- artifact assembly helpers
- browser-shell implementation details
- host adapter body normalization details
- default UI implementation details

The default learning path should be:

1. define an app with `createApp(...)`
2. host it with `@mdanai/sdk/server/node` or `@mdanai/sdk/server/bun`
3. optionally use `@mdanai/sdk/surface` if a custom frontend is needed

## Target Public Surfaces

### 1. `@mdanai/sdk`

This is the primary public entrypoint.

It should contain:

- `createApp(...)`
- `actions.*`
- `fields.*`
- app-facing options and a small number of app-facing types
- session mutation helpers that app code naturally uses

It should not expose:

- protocol modeling details
- broad runtime tuning knobs
- artifact assembly internals
- host adapter internals
- large inferred authoring type graphs that add noise without real value

### 2. `@mdanai/sdk/surface`

This remains public.

Reason:

- it represents a real independent capability boundary
- custom frontends need a stable continuation/runtime layer
- it is the right place for React, Vue, or custom browser integration

It should remain:

- independent from `ui`
- independent from Lit
- independent from markdown rendering implementation details

### 3. `@mdanai/sdk/server/node` and `@mdanai/sdk/server/bun`

These remain public as host adapters.

Reason:

- apps still need a runtime-specific host bridge
- this is infrastructure glue, not an authoring surface

They should stay thin and should not become alternate authoring APIs.

## Surfaces To De-Emphasize

### 4. `@mdanai/sdk/ui`

This should not be treated as a primary product entrypoint.

Recommended positioning:

- optional default UI implementation
- useful for internal composition, examples, and compatibility
- not part of the recommended path for new integrations

Longer-term target:

- either keep it as an explicitly secondary implementation package
- or stop exporting it publicly once `root + surface` is sufficient

### 5. `@mdanai/sdk/server`

This should not be treated as the main way to build apps.

Recommended positioning:

- lower-level runtime entry
- used for advanced integration, framework embedding, tests, and compatibility
- not the default entry for application development

Longer-term target:

- keep only the truly necessary lower-level runtime API
- continue removing helper exports that are really adapter/runtime internals
- potentially reclassify it as advanced/secondary in docs and package guidance

## End-State Mental Model

For most developers:

1. use `@mdanai/sdk`
2. use `@mdanai/sdk/server/node` or `@mdanai/sdk/server/bun`
3. only touch `@mdanai/sdk/surface` if you need a custom frontend

Everything else is implementation or advanced integration detail.

That is the intended final product story.

## Consolidation Rules

When deciding whether something should stay public, apply these rules:

### Keep Public

Keep it public if it is:

- necessary for the main app authoring flow
- necessary for the custom frontend flow
- a stable host adapter entry
- a real standalone capability boundary

### Move Down Or Remove

Move it down or remove it from the main barrel if it is:

- only used by tests
- only used by host adapters
- only used by the default UI implementation
- mainly a configuration/tuning detail for runtime internals
- an implementation helper that app authors should never need to learn
- a type graph that TypeScript can infer in normal usage

## Rollout Plan

### Phase 1: Documentation And Public Messaging

Status: mostly in progress

Goals:

- make `@mdanai/sdk` the default documented entrypoint
- make `@mdanai/sdk/surface` the documented custom frontend path
- demote `server` and `ui` from the main learning path

Work:

- docs homepage points to app-first guidance
- developer path docs describe `root + surface` as the main split
- public API docs describe `server` as lower-level and `ui` as optional
- scaffolding docs describe `@mdanai/sdk` as the primary package

### Phase 2: Root Surface Narrowing

Status: in progress

Goals:

- keep root focused on app authoring
- remove low-value or inferable exported types
- stop leaking runtime implementation details into app options

Work:

- keep `createApp(...)` options explicitly shaped
- keep app-facing browser-shell and markdown-rendering types narrow
- remove broad authoring/runtime type exports from the root barrel

### Phase 3: Server Barrel Narrowing

Status: in progress

Goals:

- keep `@mdanai/sdk/server` centered on real lower-level runtime API
- remove helpers that are actually host/adapter/internal details

Work:

- remove browser-shell implementation helpers from the main barrel
- remove body-normalization helpers from the main barrel
- remove runtime tuning types from the main barrel when possible
- remove detailed validation helper type graphs from the main barrel

### Phase 4: `ui` Demotion

Status: pending

Goals:

- ensure no primary examples or top-level docs require `@mdanai/sdk/ui`
- keep `ui` positioned as optional implementation, not product surface

Work:

- remove `ui` from default decision trees
- ensure custom frontend docs point to `surface`, not `ui`
- audit examples and guides for accidental `ui` promotion

### Phase 5: `server` Demotion Decision

Status: pending

Goals:

- decide whether `@mdanai/sdk/server` remains a public advanced entry
- or should eventually become a more explicitly internal/secondary path

Decision criteria:

- do advanced users still need direct runtime modeling that root cannot express?
- are there still framework embedding cases that genuinely need `createMdanServer(...)`?
- can those capabilities be preserved without making `server` feel like a first-class app authoring API?

Possible outcomes:

- keep `server` public but secondary
- move `server` to advanced docs only
- eventually stop exporting it from the package root exports map

## What Not To Do

- do not expand root with more protocol-shaped helpers
- do not promote `ui` because it is convenient for examples
- do not keep adapter/test helpers public just because they already exist
- do not treat legacy compatibility exports as justification for permanent
  public complexity

## Current Working Direction

The current convergence work should continue with this priority order:

1. protect `root` as the primary product surface
2. protect `surface` as the custom frontend boundary
3. keep shrinking `server` to its true lower-level essentials
4. keep demoting `ui` from the main story
5. only after that, decide whether `server` and `ui` should remain exported at
   all

## Success Criteria

We should consider this work successful when:

- a new app developer only needs `@mdanai/sdk`
- a custom frontend developer only needs `@mdanai/sdk` plus `@mdanai/sdk/surface`
- docs no longer present `server` or `ui` as default starting points
- the main barrels stop leaking implementation helpers and tuning details
- the remaining public surfaces correspond to real user-facing capability
  boundaries rather than repository structure
