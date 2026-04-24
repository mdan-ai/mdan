---
title: MDAN Representations
description: Normative contract for MDAN representations, projection consistency, and representation negotiation.
---

# MDAN Representations

- Status: Draft
- Version: vNext

## 1. Scope

This document defines the normative representation model for MDAN surfaces.

It covers:

- representation categories
- consistency across projections
- negotiation expectations

It does not define:

- a single mandatory browser format
- a single mandatory transport envelope for every representation
- a specific rendering engine
- a specific host implementation

## 2. Representation Principle

An MDAN surface may be exposed through multiple representations.

Different representations MAY optimize for different consumers, but they MUST
describe the same underlying surface semantics when they refer to the same
state.

## 3. Recognized Representation Categories

This specification recognizes the following representation categories:

- Markdown surface representation
- HTML projection
- event or stream-oriented incremental transport

Other compatible representation categories MAY exist if they preserve the same
state, action, and safety semantics.

## 4. Markdown Surface Representation

A Markdown surface representation is a readable representation that preserves
shared readable content and executable state metadata.

When exposed, a Markdown surface representation:

- MUST remain readable without client-side execution
- MUST preserve executable truth through its declared metadata

The surface contract is defined separately in the surface specification.

## 5. HTML Projection

HTML is a projection of the same underlying surface for browser-oriented
consumption.

HTML:

- MAY optimize presentation for human-visible consumption
- MUST NOT become the sole public source of executable truth for the same
  interactive surface
- MUST remain semantically aligned with the underlying state and action
  contract

## 6. Stream-Oriented Representations

Incremental or stream-oriented representations MAY exist for compatible flows.

When used:

- the stream MUST remain attributable to a coherent underlying state flow
- incremental delivery MUST NOT silently contradict the resulting settled state

## 7. Cross-Representation Consistency

If two representations describe the same surface state, they MUST remain
consistent in:

- application identity
- state identity
- action set
- block-scoped action availability semantics
- trust and security semantics
- page versus region outcome semantics

A representation MAY omit information that is unavailable or irrelevant for its
consumer, but it MUST NOT contradict the normative semantics of another
representation of the same state.

## 8. Negotiation

If an implementation supports representation negotiation, it:

- MUST respond according to an explicit negotiation result, or
- MUST explicitly reject unsupported representation requests

An implementation MUST NOT silently substitute a conflicting representation when
the request semantics clearly require another form.

For deterministic `Accept` parsing, weighting, and tie-break behavior, see
[Representation Negotiation](/spec/representation-negotiation).

## 9. Compatibility Rules

Additional projections or transport forms MAY coexist.

However:

- they MUST remain subordinate to the same underlying surface semantics
- they MUST NOT redefine state truth, action truth, or safety rules
