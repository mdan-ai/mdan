---
title: MDAN Action Execution
description: Normative contract for MDAN action metadata, execution semantics, and state transition outcomes.
---

# MDAN Action Execution

- Status: Draft
- Version: vNext

## 1. Scope

This document defines the normative execution contract for MDAN actions.

It covers:

- action metadata shape
- block-scoped action availability semantics
- method and target semantics
- input declaration semantics
- page and region state-effect semantics

It does not define:

- a specific transport adapter implementation
- a specific UI presentation
- a specific action-proof signing algorithm

## 2. Action Model

An MDAN surface MAY expose zero or more actions.

Each action represents a potential next operation from the current state.

Each action entry is keyed by a stable action id in the surrounding `actions`
object and MUST have a non-empty `target`.

The current interoperable action shape is:

```ts
type MdanActions = Record<string, MdanAction>;

type MdanAction = {
  label?: string;
  verb?: "route" | "read" | "write";
  target: string;
  auto?: boolean;
  block?: string;
  transport?: {
    method?: "GET" | "POST";
  };
  input_schema?: {
    type?: "object";
    required?: string[];
    properties?: Record<string, unknown>;
    additionalProperties?: boolean;
  };
  state_effect?: {
    response_mode?: "page" | "region";
    updated_regions?: string[];
  };
  action_proof?: string;
  submit_format?: string;
  requires_confirmation?: boolean;
  submit_example?: Record<string, unknown>;
};
```

For the complete field-level reference (including guard/security/runtime-injected
execution metadata), see [Actions JSON Field Reference](/spec/action-json-fields).

Field notes:

- `auto`, when `true`, marks a GET action as an auto-resolvable dependency
  candidate in implementations that support auto dependency resolution.
- `block` associates the action with a rendered region/block in the current
  surface projection.
- `auto` MUST NOT bypass action proof requirements, block/action consistency checks, or
  authorization checks.

## 3. Action Identity

For a single surface state:

- every action `id` MUST be unique within that surface
- the same `id` SHOULD keep the same user-level meaning within a stable flow
- consumers MUST address actions by `id`, not by label text alone

## 4. Method And Target

`target` identifies the operation endpoint for the action.

`transport.method` identifies the HTTP method when explicitly present.

Method semantics:

- `GET` means a read-style operation
- `POST` means a submitted action operation

When `transport.method` is absent:

- consumers SHOULD derive `GET` for `verb: "route"` and `verb: "read"`
- consumers SHOULD derive `POST` for `verb: "write"`
- producers SHOULD prefer declaring the method explicitly

## 5. Block-Scoped Action Availability

The current runtime model does not use a top-level `allowed_next_actions`
allow-list.

Instead, a returned surface declares action availability through:

- the top-level `actions` object, which defines executable actions by id
- `blocks.<id>.actions`, which associates action ids with readable
  blocks/regions

Current runtimes MUST reject `allowed_next_actions` in the action manifest.

## 6. Input Contract

`input_schema` declares the accepted input shape for the action.

For normative input value and schema semantics, see
[Input And Input Schema](/spec/input-and-schema).

For interoperable use:

- `input_schema.type` SHOULD be `object`
- `input_schema.required`, when present, MUST list required input field names
- `input_schema.properties`, when present, defines declared input fields
- `additionalProperties`, when present, constrains undeclared fields

Consumers:

- MUST treat the declared schema as the source of accepted input shape
- MUST NOT invent undeclared required fields

Producers:

- SHOULD declare explicit field properties for submitted actions
- SHOULD keep the schema aligned with the actual accepted input contract

## 7. State Effect

`state_effect` describes the intended result shape of successful execution.

The interoperable values are:

- `response_mode: "page"`
- `response_mode: "region"`

Semantics:

- `page` means the result replaces the current page-level surface
- `region` means the result is intended to update targeted regions when safe

When `response_mode` is `region`:

- if `updated_regions` is omitted, the submitted action's mounted block is the
  default target region
- `updated_regions` identifies explicit target regions for cross-block or
  multi-block updates
- consumers MUST fall back to page replacement if region application is unsafe
  or ambiguous

For full patch/fallback contract details, see
[Region Update Semantics](/spec/region-update-semantics).

## 8. Verb Semantics

`verb` communicates the semantic intent of the action.

Stable interoperable values are:

- `route`
- `read`
- `write`

These values:

- MAY influence client dispatch behavior
- MAY influence UI presentation
- MUST NOT weaken security or authorization requirements

## 9. Execution Outcomes

A successful action execution MAY produce:

- a new page surface
- a region-oriented update surface
- a streaming result, when separately negotiated by representation

Ordinary action execution:

- SHOULD return the next readable surface
- SHOULD preserve executable truth in the resulting surface representation
- MUST keep route and state semantics aligned with the returned surface

## 10. Failure Semantics

If an action cannot be executed:

- the response SHOULD remain readable where possible
- the response MUST NOT imply that a forbidden action succeeded
- the resulting surface MAY change block/action associations in the next
  returned state

## 11. Consumer Requirements

A conforming action consumer:

- MUST choose actions by declared `id`
- MUST submit to the declared `target`
- MUST use the declared or derived method consistently
- MUST build inputs from `input_schema` when present
- MUST treat `state_effect` as execution intent, not as permission to skip
  validation or safety checks

For strict runtime validation claims, see
[Action Envelope Validation Profile](/spec/action-envelope-validation-profile).
