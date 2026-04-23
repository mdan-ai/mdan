---
title: MDAN Region Update Semantics
description: Normative semantics for region-mode action outcomes, safety checks, and page fallback behavior.
---

# MDAN Region Update Semantics

- Status: Draft
- Version: vNext

## 1. Scope

This document defines interoperable behavior for region-oriented action
outcomes.

It covers:

- `state_effect.response_mode = "region"`
- `updated_regions` semantics
- region patch safety and fallback behavior

It does not define:

- specific DOM patch algorithms
- framework-level rendering details
- SDK convenience APIs

## 2. Core Model

Region mode is an optimization over page replacement, not a different state
truth model.

The resulting settled surface remains authoritative regardless of whether a
consumer applies a partial patch or full replacement.

## 3. Region Outcome Declaration

When an action declares:

```json
{
  "state_effect": {
    "response_mode": "region",
    "updated_regions": ["main"]
  }
}
```

then:

- `response_mode = "region"` signals intended partial update semantics.
- `updated_regions` identifies intended region names.

`updated_regions` SHOULD be present for region mode.

## 4. Safe Application Requirements

A consumer MAY apply region patch behavior only when all of the following are
true:

1. Region identifiers are unambiguous in current surface context.
2. Returned content for targeted regions is structurally valid.
3. Action/state identity remains coherent after applying the patch.
4. Allow-list/action semantics remain coherent after applying the patch.

If any condition fails, consumer MUST fall back to page-level replacement using
the returned settled surface.

## 5. Fallback Rules

Fallback to page replacement is REQUIRED when:

- a target region does not exist
- region names are duplicated or ambiguous
- returned region payload is missing for a required target
- patching would cause state/action metadata divergence
- consumer cannot prove patch safety for current representation

Fallback MUST preserve settled state truth.

## 6. Producer Requirements

A producer using region mode:

- MUST keep region payload and action metadata semantically aligned
- SHOULD include stable region names across related states
- SHOULD avoid region mode when operation semantics imply broad page
  restructuring

Producer MUST NOT rely on consumer-side patch success for correctness.

## 7. Consumer Requirements

A conforming consumer:

- MUST treat region mode as intent, not a guaranteed patch instruction
- MUST preserve state/action truth even when patch is skipped
- MUST prefer safe fallback over unsafe partial application

## 8. Conformance Checklist

A conforming implementation MUST:

- interpret `response_mode: "region"` as optional patch optimization
- enforce safety checks before applying region patch
- provide deterministic page fallback behavior
- keep final state/action semantics equivalent to settled response
