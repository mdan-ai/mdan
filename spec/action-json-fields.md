---
title: Actions JSON Field Reference
description: Normative field-by-field reference for the MDAN actions JSON contract, including action object fields and execution metadata.
---

# Actions JSON Field Reference

- Status: Draft
- Version: vNext

## 1. Scope

This document defines field-level semantics for the MDAN actions JSON contract.

It complements:

- [Application Surface Spec](/spec/application-surface)
- [Surface Contract](/spec/surface-contract)
- [Action Execution](/spec/action-execution)
- [Action Proof](/spec/action-proof)

## 2. Contract Shape

The executable action metadata is represented as a JSON object:

```ts
type ActionsContract = {
  app_id?: string;
  state_id?: string;
  state_version?: number;
  blocks?: string[];
  regions?: Record<string, string>;
  actions: ActionObject[];
  allowed_next_actions?: string[];
  security?: {
    default_confirmation_policy?: "never" | "always" | "high-and-above";
  };
};
```

## 3. Contract-Level Fields

### 3.1 `app_id`

- type: string
- required: SHOULD for interactive surfaces
- meaning: application namespace identifier.

### 3.2 `state_id`

- type: string
- required: SHOULD for interactive surfaces
- meaning: logical state identity in current app namespace.

### 3.3 `state_version`

- type: number
- required: SHOULD for interactive surfaces
- meaning: version marker for state transitions.

### 3.4 `blocks`

- type: string[]
- required: optional
- meaning: declared region/block names for this state.

### 3.5 `actions`

- type: array of action objects
- required: MUST
- meaning: executable actions for the current state.

### 3.6 `allowed_next_actions`

- type: string[]
- required: optional
- meaning: allow-list of executable action ids from `actions`.
- rule: each id MUST reference an existing action `id`.

### 3.7 `regions`

- type: `Record<string, string>`
- required: optional
- meaning: rendered region payload keyed by region/block name.

### 3.8 `security`

- type: object
- required: optional
- meaning: contract-level default security behavior.

`security.default_confirmation_policy`:

- allowed values: `never`, `always`, `high-and-above`
- meaning: default confirmation policy when action-level override is absent.

## 4. Action Object Fields

```ts
type ActionObject = {
  id: string;
  label?: string;
  verb?: "route" | "read" | "write";
  target: string;
  transport?: {
    method?: "GET" | "POST";
  };
  auto?: boolean;
  input_schema?: {
    type?: unknown;
    required?: unknown;
    properties?: unknown;
    additionalProperties?: unknown;
  };
  state_effect?: {
    response_mode?: "page" | "region";
    updated_regions?: string[];
  };
  guard?: {
    risk_level?: string;
  };
  security?: {
    confirmation_policy?: "never" | "always" | "high-and-above";
  };
  action_id?: string;
  action_proof?: string;
  action_issued_at?: number;
  submit_format?: string;
  requires_confirmation?: boolean;
  submit_example?: Record<string, unknown>;
  block?: string;
};
```

### 4.1 Required Core

- `id`: non-empty string, unique within `actions`.
- `target`: non-empty string action target path.

### 4.2 `label`

- type: string
- meaning: user-facing action label.

### 4.3 `verb`

- type: string enum
- allowed values: `route`, `read`, `write`
- meaning:
  - `route`: page navigation/read semantics.
  - `read`: data refresh/read semantics.
  - `write`: mutation semantics.

### 4.4 `transport.method`

- type: string enum
- allowed values in current runtime: `GET`, `POST`
- meaning: HTTP transport method for action execution.
- default mapping:
  - `route`/`read` -> `GET`
  - `write` -> `POST`

### 4.5 `auto`

- type: boolean
- meaning: marks GET action as auto-resolvable dependency candidate.

### 4.6 `input_schema`

- type: JSON object-schema
- meaning: action input constraints and shape.
- commonly includes:
  - `type: "object"`
  - `required: string[]`
  - `properties: Record<string, unknown>`
  - `additionalProperties: boolean`

### 4.7 `block`

- type: string
- meaning: source region/block id associated with the current action.

### 4.8 `state_effect`

- `response_mode`: `page` or `region`
- `updated_regions`: region names for region updates.

### 4.9 `guard`

- `risk_level`: implementation-defined risk marker string.

### 4.10 `security.confirmation_policy`

- allowed values: `never`, `always`, `high-and-above`
- meaning: action-level confirmation policy override.

## 5. Runtime-Injected Execution Metadata

The following fields are runtime execution metadata and may be added after
action-proof processing:

- `action_id`
- `action_proof`
- `action_issued_at`
- `submit_format`
- `requires_confirmation`
- `submit_example`

These fields MUST NOT change the underlying action identity or target semantics.

## 6. Validation Rules

Conforming validators MUST enforce at least:

1. `actions` exists and is an array.
2. each action has non-empty `id` and `target`.
3. action `id` values are unique.
4. `verb`, when present, is one of `route/read/write`.
5. `transport.method`, when present, is one of `GET/POST` for current runtime profile.
6. `state_effect.response_mode`, when present, is `page` or `region`.
7. `regions`, when present, is an object with string values.
8. `block`, when present, is a string.
9. `allowed_next_actions`, when present, references existing action ids only.
10. confirmation policy values, when present, are valid enums.

## 7. Example

```json
{
  "app_id": "weather",
  "state_id": "weather:/:3",
  "state_version": 3,
  "blocks": ["query"],
  "regions": {
    "query": "Location: {{location}}"
  },
  "actions": [
    {
      "id": "query_weather",
      "label": "Query",
      "verb": "read",
      "target": "/",
      "block": "query",
      "transport": { "method": "GET" },
      "input_schema": {
        "type": "object",
        "required": ["location"],
        "properties": {
          "location": { "type": "string" },
          "range": { "type": "string", "enum": ["current", "today", "3d"] }
        },
        "additionalProperties": false
      },
      "state_effect": { "response_mode": "page" }
    }
  ],
  "allowed_next_actions": ["query_weather"]
}
```
