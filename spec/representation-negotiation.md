---
title: MDAN Representation Negotiation
description: Normative algorithm for selecting MDAN response representation from request negotiation metadata.
---

# MDAN Representation Negotiation

- Status: Draft
- Version: vNext

## 1. Scope

This document defines the normative negotiation behavior for MDAN response
representations.

It covers:

- `Accept`-driven selection
- quality weight (`q`) handling
- tie-break behavior
- fallback and rejection behavior

It does not define:

- host adapter internals
- response body rendering details
- non-HTTP negotiation channels

## 2. Recognized Negotiation Targets

Current interoperable negotiation targets are:

- `text/event-stream` -> `event-stream`
- `text/markdown` -> `markdown`
- `text/html`, `text/*`, `*/*` -> `html`

Other media types MAY be supported by implementation profile, but MUST NOT
conflict with these base mappings.

## 3. Request Parsing Rules

When negotiation is enabled, implementations MUST:

1. Parse `Accept` entries as comma-separated media ranges.
2. Parse optional `q` parameter per entry; default to `1`.
3. Ignore entries with `q <= 0`.
4. Match media types case-insensitively.

If `Accept` is missing, the negotiated result MUST be `html`.

## 4. Selection Algorithm

Implementations MUST select one result using:

1. Compute max effective weight per representation target.
2. Keep only targets with weight `> 0`.
3. If none remain, negotiation result is `not-acceptable`.
4. Pick target with highest weight.
5. If weights tie, apply deterministic priority:
   - `event-stream` (highest)
   - `markdown`
   - `html` (lowest)

This tie-break rule is mandatory for cross-implementation interoperability.

## 5. Result Semantics

- `event-stream`: stream-oriented representation.
- `markdown`: Markdown surface representation.
- `html`: browser-oriented projection.
- `not-acceptable`: explicit rejection; implementation SHOULD return HTTP `406`
  or equivalent explicit unsupported-representation signal.

Implementations MUST NOT silently return a conflicting representation when
negotiation result is `not-acceptable`.

## 6. Conformance Checklist

A conforming implementation MUST:

- support deterministic `q`-weight comparison
- apply the required tie-break order
- default to `html` when `Accept` is absent
- emit explicit rejection when no target is acceptable
- keep selected representation aligned with state/action semantics

## 7. Example

Request:

```http
Accept: text/markdown;q=0.8, text/event-stream;q=0.8, text/html;q=0.8
```

Result:

- selected representation: `event-stream` (tie-break priority)
