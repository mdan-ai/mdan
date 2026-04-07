# MDAN Browser Host Profile

This document describes browser-facing host responsibilities for MDAN.

If you want the complete MDAN specification, use:

- [MDAN Spec](./spec.md)

If you want the public versioned entry, use:

- [MDAN Spec v1](./v1.md)

## Scope

This document covers browser-facing host behavior for MDAN applications.

It defines:

- how HTML should relate to canonical Markdown
- what a browser host should preserve when projecting MDAN into HTML
- how follow-up interaction should continue after the initial HTML response

It does not define:

- a specific JavaScript runtime API
- a specific UI framework
- a required DOM implementation strategy
- a required default visual design

## Browser Host Responsibilities

A browser-facing host should:

- project the current MDAN page or fragment into HTML
- preserve a path back to the canonical Markdown representation
- keep page and block continuation aligned with the same MDAN app state
- avoid introducing a second application model that drifts away from canonical Markdown

## HTML Projection Expectations

HTML is a projection of the same MDAN app state, not a separate source of truth.

The browser host should preserve:

- the current page route
- the current block structure
- the current available operations
- enough information for follow-up interaction to remain aligned with the same MDAN state

## Follow-up Interaction In Browser

After the initial HTML response, a browser host should continue interaction against the same MDAN app model.

That means:

- `GET` and `POST` operations should keep the same targets and semantics they have in canonical Markdown
- block-local actions should continue updating the same interaction region
- page transitions should continue to represent the next MDAN page state, not a disconnected browser-only flow

## Error Surface Expectations

Browser-facing hosts should preserve recoverable interaction when possible.

That means a browser-facing error state should still map back to the same MDAN interaction semantics:

- recoverable actions should remain available
- follow-up steps should stay aligned with the same page or fragment logic
- browser rendering should not erase the next valid operation if the Markdown result still defines one

## Discovery Expectations

Browser-facing HTML should help clients discover the canonical Markdown source through:

- `rel="alternate" type="text/markdown"`
- optional `rel="llms-txt"`
- optional equivalent `Link` headers

## Out Of Scope

This profile does not require:

- a specific browser runtime package
- a specific UI component library
- a specific hydration strategy
- a specific client-side state container
