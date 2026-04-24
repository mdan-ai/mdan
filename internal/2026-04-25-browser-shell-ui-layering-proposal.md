---
title: Browser Shell UI Layering Proposal
description: Correct the surface/ui boundary by moving default browser-shell rendering entirely into the ui layer before adding form customization APIs.
---

# Browser Shell UI Layering Proposal

Date: 2026-04-25

## Problem

The current SDK browser shell has a layering violation:

- `surface` is supposed to be the headless/runtime layer
- `ui` is supposed to be the default presentation layer

But today `src/surface/snapshot.ts` renders default browser-shell HTML for:

- forms
- fields
- submit buttons

At the same time, hydrated rendering lives in:

- `src/ui/mount.ts`
- `src/ui/components/*`

That means the default UI is split across two layers:

- SSR/snapshot UI in `surface`
- hydrated UI in `ui`

This is the core architectural problem. It is more fundamental than missing
form customization hooks.

## Why This Matters

As long as `surface` owns part of the default UI:

- `surface` is no longer a pure headless/runtime layer
- `ui` is not the single owner of default presentation
- snapshot and hydration naturally drift
- external customization hooks end up attaching to the wrong layer

This makes APIs like custom form rendering or theme injection harder to design
correctly.

## Goals

1. Restore the intended layering:
   - `surface` owns headless behavior and projection models
   - `ui` owns all default browser-shell presentation
2. Move default browser-shell snapshot rendering into `ui`
3. Keep current public behavior unchanged while correcting the boundary
4. Create a clean base for future `form` customization and theme APIs

## Non-Goals

1. Do not add public form customization APIs in this phase
2. Do not redesign the headless host protocol in this phase
3. Do not change browser-shell behavior or visual output intentionally in this phase

## Current Architecture

### Correctly in `surface`

- `src/surface/headless.ts`
- `src/surface/adapter.ts`
- `src/surface/protocol-model.ts`
- `src/surface/presentation.ts`

These are headless/runtime-oriented.

### Incorrectly in `surface`

- `src/surface/snapshot.ts`

This file currently renders HTML for:

- `<form>`
- `<input>`
- `<textarea>`
- `<select>`
- `<button>`

That is default UI work and should live in `ui`.

### Correctly in `ui`

- `src/ui/mount.ts`
- `src/ui/model.ts`
- `src/ui/components/*`
- `src/ui/theme.ts`

These are already the default hydrated UI path.

## Proposed Direction

## Phase 1: Move Snapshot Rendering Into `ui`

Move default browser-shell HTML snapshot rendering from:

- `src/surface/snapshot.ts`

to:

- `src/ui/snapshot.ts`

After this change:

- `surface` no longer renders default HTML controls
- `ui` owns both snapshot and hydrated rendering

`server`-side initial projection should call the `ui` snapshot renderer, not a
`surface` renderer.

### Expected dependency direction

- `ui` may depend on `surface`
- `surface` must not depend on `ui`

That matches the intended architecture:

- headless model first
- default presentation on top

## Phase 2: Unify Default UI Render Model Inside `ui`

Once snapshot rendering lives in `ui`, align `src/ui/snapshot.ts` and
`src/ui/mount.ts` around shared UI-focused model helpers.

This is where we should unify:

- field/control selection
- action presentation semantics
- default value rules
- GET omission rules
- enctype handling
- descriptive metadata mapping

This unification should happen inside `ui`, not by pushing UI concerns back into
`surface`.

## Phase 3: Add UI-Level Form Customization

Only after the layering is corrected should we add customization APIs.

The future hook should attach to the default browser-shell UI layer, not the
headless `surface` layer.

Likely direction:

- `browserShell.ui.form`
- later possibly `browserShell.ui.theme`

Not:

- `surface.form`
- or generic runtime-level rendering hooks

## First Implementation Slice

The first implementation slice should:

1. add `src/ui/snapshot.ts`
2. move the existing snapshot HTML renderer there
3. update `src/server/markdown-surface.ts` to use the `ui` snapshot renderer
4. delete `src/surface/snapshot.ts`
5. update tests that encode the old structure

This slice intentionally fixes ownership first without changing app-facing APIs.

## Validation

The change is acceptable when:

1. current browser-shell snapshot tests still pass
2. `npm test` and `npm run build` stay green
3. `surface` no longer contains default form rendering code
4. the server/browser-shell path still renders the same initial HTML behavior

## Follow-Up Work

After Phase 1 lands, the next internal proposal should focus on:

1. shared UI render model between snapshot and hydration
2. minimal form renderer injection API
3. theme/token layering in the default UI system
