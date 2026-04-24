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
  blocks?: Record<string, BlockObject>;
  regions?: Record<string, string>;
  actions?: Record<string, ActionObject>;
  security?: {
    default_confirmation_policy?: "never" | "always" | "high-and-above";
  };
};

type BlockObject = {
  trust?: "trusted" | "untrusted";
  actions?: string[];
  auto?: boolean;
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

- type: object keyed by block id
- required: optional
- meaning: declared regions/blocks for this state, including per-block trust,
  action references, and optional auto-resolution hints.

### 3.5 `actions`

- type: object keyed by action id
- required: MUST
- meaning: executable actions for the current state.

### 3.6 `regions`

- type: `Record<string, string>`
- required: optional
- meaning: rendered region payload keyed by region/block name.

### 3.7 `security`

- type: object
- required: optional
- meaning: contract-level default security behavior.

`security.default_confirmation_policy`:

- allowed values: `never`, `always`, `high-and-above`
- meaning: default confirmation policy when action-level override is absent.

## 4. Block Object Fields

```ts
type BlockObject = {
  trust?: "trusted" | "untrusted";
  actions?: string[];
  auto?: boolean;
};
```

### 4.1 `trust`

- type: string enum
- allowed values: `trusted`, `untrusted`
- meaning: interpretation boundary for that block's rendered content.

### 4.2 `actions`

- type: string[]
- meaning: action ids associated with the block.
- rule: every id MUST reference an existing key in the top-level `actions`
  object.

### 4.3 `auto`

- type: boolean
- meaning: marks the block as participating in auto dependency resolution when
  supported by the implementation.

## 5. Action Object Fields

```ts
type ActionObject = {
  label?: string;
  verb?: "route" | "read" | "write";
  target?: string;
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

Each action id is carried by the key under `actions.<id>`, not by a required
`id` field inside the action object itself.

### 5.1 Required Core

- action keys under `actions` MUST be non-empty and unique.
- `target` MUST be a non-empty string action target path.

### 5.2 `label`

- type: string
- meaning: user-facing action label.

### 5.3 `verb`

- type: string enum
- allowed values: `route`, `read`, `write`
- meaning:
  - `route`: page navigation/read semantics.
  - `read`: data refresh/read semantics.
  - `write`: mutation semantics.

### 5.4 `transport.method`

- type: string enum
- allowed values in current runtime: `GET`, `POST`
- meaning: HTTP transport method for action execution.
- default mapping:
  - `route`/`read` -> `GET`
  - `write` -> `POST`

### 5.5 `auto`

- type: boolean
- meaning: marks GET action as auto-resolvable dependency candidate.

### 5.6 `input_schema`

- type: JSON object-schema
- meaning: action input constraints and shape.
- commonly includes:
  - `type: "object"`
  - `required: string[]`
  - `properties: Record<string, unknown>`
  - `additionalProperties: boolean`

### 5.7 `block`

- type: string
- meaning: source region/block id associated with the current action.

### 5.8 `state_effect`

- `response_mode`: `page` or `region`
- `updated_regions`: region names for region updates.

### 5.9 `guard`

- `risk_level`: implementation-defined risk marker string.

### 5.10 `security.confirmation_policy`

- allowed values: `never`, `always`, `high-and-above`
- meaning: action-level confirmation policy override.

## 6. Runtime-Injected Execution Metadata

The following fields are runtime execution metadata and may be added after
action-proof processing:

- `action_id`
- `action_proof`
- `action_issued_at`
- `submit_format`
- `requires_confirmation`
- `submit_example`

These fields MUST NOT change the underlying action identity or target semantics.

## 7. Validation Rules

Conforming validators MUST enforce at least:

1. `actions` exists and is an object keyed by action id.
2. each action key is non-empty.
3. each action has non-empty `target`.
4. `blocks`, when present, is an object keyed by block id.
5. each `blocks.<id>.actions` entry, when present, references an existing action id.
6. `verb`, when present, is one of `route/read/write`.
7. `transport.method`, when present, is one of `GET/POST` for current runtime profile.
8. `state_effect.response_mode`, when present, is `page` or `region`.
9. `regions`, when present, is an object with string values.
10. `block`, when present, is a string.
11. confirmation policy values, when present, are valid enums.
12. `allowed_next_actions`, when present, MUST be rejected by current runtimes.

## 8. Example

```json
{
  "app_id": "weather",
  "state_id": "weather:/:3",
  "state_version": 3,
  "blocks": {
    "query": {
      "actions": ["query_weather"],
      "trust": "untrusted"
    }
  },
  "regions": {
    "query": "Location: {{location}}"
  },
  "actions": {
    "query_weather": {
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
  }
}
```
