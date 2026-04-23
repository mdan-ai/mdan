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
- execution allow-list semantics
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

An action object MUST have:

- a stable `id`
- a non-empty `target`

The current interoperable action shape is:

```ts
type MdanAction = {
  id: string;
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
- `auto` MUST NOT bypass action proof requirements, allow-list checks, or
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

## 5. Allowed Next Actions

`allowed_next_actions` is the current-state execution allow-list.

When `allowed_next_actions` is present:

- it MUST be an array of action ids
- each listed id MUST exist in `actions`
- consumers MUST NOT execute actions absent from the allow-list

When `allowed_next_actions` is omitted:

- the surface MAY be interpreted as allowing any declared action

An explicitly empty `allowed_next_actions` means:

- the surface currently exposes no executable next action

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
- `region` means the result is intended to update only named regions when safe

When `response_mode` is `region`:

- `updated_regions` SHOULD identify the intended regions
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
- the resulting surface MAY narrow or clear `allowed_next_actions`

## 11. Consumer Requirements

A conforming action consumer:

- MUST choose actions by declared `id`
- MUST respect `allowed_next_actions`
- MUST submit to the declared `target`
- MUST use the declared or derived method consistently
- MUST build inputs from `input_schema` when present
- MUST treat `state_effect` as execution intent, not as permission to skip
  validation or safety checks

For strict runtime validation claims, see
[Action Envelope Validation Profile](/spec/action-envelope-validation-profile).
