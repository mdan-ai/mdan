---
title: MDAN Surface Contract
description: Normative contract for Markdown surface representations and action surfaces in MDAN.
---

# MDAN Surface Contract

- Status: Draft
- Version: vNext

## 1. Scope

This document defines the normative contract for Markdown surface
representations as the primary public read representation of an MDAN action
surface.

It defines:

- the required separation between readable Markdown and executable state
- the surface-level identity fields
- the embedded `mdan` fenced block contract
- the relationship between page-level and region-level surfaces
- the representation role of Markdown surface representations relative to HTML
  projection

It does not define:

- any SDK-specific API
- any specific host adapter behavior
- any specific browser UI implementation
- any non-surface compatibility transport details

## 2. Representation Role

A Markdown surface representation is the primary public read representation for
an MDAN action surface.

A conforming implementation:

- MUST be able to expose the current readable surface as Markdown
- MUST preserve the same executable state semantics across all projections of
  the same surface
- MUST NOT make HTML or another projection the only public source of
  executable truth

HTML is a projection of the same surface for browser consumption. It is not the
normative source of MDAN state.

## 3. Markdown Surface Shape

A Markdown surface representation consists of:

- optional frontmatter
- a readable Markdown body
- an embedded fenced code block with info string `mdan`

Example:

```md
---
route: "/login"
app_id: "auth-guestbook"
state_id: "auth-guestbook:login:1"
state_version: 1
---

# Sign In

...readable Markdown body...

```mdan
{
  "app_id": "auth-guestbook",
  "state_id": "auth-guestbook:login:1",
  "state_version": 1,
  "blocks": {
    "login": {
      "actions": [],
      "trust": "untrusted"
    }
  },
  "actions": {}
}
```
```

## 4. Frontmatter

Frontmatter carries surface-level identity and routing metadata.

When present, these fields have stable semantics:

- `route`
- `app_id`
- `state_id`
- `state_version`

Conforming implementations:

- SHOULD include `route`, `app_id`, `state_id`, and `state_version` in
  frontmatter for interactive page surfaces
- MUST treat `state_id` and `state_version` as state identity metadata when
  present
- MUST NOT interpret frontmatter alone as the full executable contract

If both frontmatter and the embedded `mdan` block provide overlapping identity
fields, they MUST describe the same surface state.

## 5. Readable Markdown Body

The readable Markdown body is the normative readable content for humans and
agents.

The body:

- MAY include ordinary Markdown content
- MAY include named block regions
- MAY include semantic-slot headings
- MAY include agent-only blocks
- MUST remain readable without executing client-side code

The readable body MUST NOT be treated as the only executable source of truth.
Executable actions and state identity belong to the embedded `mdan` block.

## 6. Embedded `mdan` Block

The embedded `mdan` fenced block carries the executable state declaration for
the action surface.

The block payload MUST be valid JSON.

The root object MAY include additional fields, but the stable executable fields
are:

```ts
type SurfaceExecutableState = {
  app_id?: string;
  state_id?: string;
  state_version?: number;
  blocks?: Record<string, unknown>;
  actions?: Record<string, unknown>;
};
```

Conforming implementations:

- MUST expose executable actions through the `mdan` block for interactive
  surfaces
- MUST serialize the block as JSON, not as implementation-specific source code
- MUST keep the block semantically aligned with the readable body
- MUST NOT require consumers to infer actions from HTML projection alone

## 7. Surface Identity

An interactive action surface is identified by:

- `app_id`
- `state_id`
- `state_version`

The contract requires:

- `app_id` identifies the application namespace
- `state_id` identifies the current logical state instance
- `state_version` identifies the current version of that state

Implementations:

- MUST NOT silently merge two surfaces with conflicting identity fields
- SHOULD treat a changed `state_id` or `state_version` as a state transition
- MAY treat missing identity fields as a reduced-capability or non-interactive
  surface

## 8. Page And Region Surfaces

A Markdown surface representation may describe:

- a full page surface
- a region-oriented update surface

Page-oriented results replace the current surface.

Region-oriented results:

- MUST still describe executable truth through the `mdan` block
- MAY update only a subset of named regions
- MUST fall back to page semantics if region identity cannot be applied safely

The surface contract itself does not require a specific patch algorithm, but it
requires region updates and page replacements to remain distinguishable in the
executable metadata.

## 9. Consumer Requirements

A conforming surface consumer:

- MUST parse the Markdown body as the readable surface
- MUST parse the embedded `mdan` block as executable metadata when present
- MUST NOT invent executable actions that are absent from the surface
- MUST preserve route and identity context across subsequent action execution

## 10. Compatibility

Other transport or projection forms MAY coexist with Markdown surface
representations.

When another representation is projected into a Markdown surface representation:

- the readable content MUST remain equivalent
- the executable action/state contract MUST remain equivalent
- the resulting representation becomes the primary public read representation
