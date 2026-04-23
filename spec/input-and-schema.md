---
title: Input And Input Schema
description: Normative definition of MDAN action input values, input_schema semantics, validation requirements, and normalization boundaries.
---

# Input And Input Schema

- Status: Draft
- Version: vNext

## 1. Scope

This document defines:

- the input value model used by action execution
- `input_schema` contract semantics
- validation and normalization requirements
- input acceptance boundaries for conforming implementations

It does not define:

- SDK-specific helper APIs
- UI rendering details for form controls
- host-specific body parsing algorithms

## 2. Input Value Model

Action input is a key-value object:

```ts
type ActionInput = Record<string, unknown>;
```

Implementations MAY support scalar and structured values:

- string
- number
- integer
- boolean
- null
- object
- array
- asset-like/binary references (implementation profile)

## 3. `input_schema` Shape

`input_schema` is an object-level schema declaration attached to each action.

Common interoperable shape:

```json
{
  "type": "object",
  "required": ["fieldA"],
  "properties": {
    "fieldA": { "type": "string" },
    "fieldB": { "type": "number", "minimum": 0 },
    "fieldC": { "type": "boolean" }
  },
  "additionalProperties": false
}
```

### 3.1 Field Semantics

- `type`
  - SHOULD be `"object"` at root.
- `required`
  - when present, MUST be an array of field names.
- `properties`
  - when present, defines declared input fields.
- `additionalProperties`
  - when `false`, undeclared fields MUST be rejected.

Per-field schema MAY include:

- `type` (`string`, `number`, `integer`, `boolean`, `object`, `array`)
- `enum`
- `minimum` / `maximum`
- `minLength` / `maxLength`
- `format` (implementation profile; e.g., date/date-time/password/binary)
- implementation extension fields (MAY, MUST NOT break base semantics)

## 4. Validation Requirements

A conforming validator MUST:

1. enforce `required` fields.
2. enforce per-field type compatibility when declared.
3. enforce scalar constraints (`minimum`, `maximum`, `minLength`, `maxLength`) when declared.
4. enforce `enum` membership when declared.
5. reject undeclared fields when `additionalProperties` is `false`.

A conforming validator SHOULD:

1. keep validation deterministic for the same payload and schema.
2. return field-level error signals that can be mapped to user/agent feedback.

## 5. Normalization Boundaries

Implementations MAY normalize input values before handler execution.

Typical safe normalization includes:

- string-to-number coercion for `number`/`integer`
- string-to-boolean coercion for `boolean`
- JSON parse attempt for declared `object`/`array` string payloads

Normalization MUST NOT:

- change field names
- inject undeclared fields
- silently bypass declared constraints

If normalization fails to satisfy declared schema constraints, execution MUST be
rejected as invalid input.

## 6. Submission Shape

Action execution payload SHOULD use structured action+input wrapper:

```json
{
  "action": {
    "proof": "<token>"
  },
  "input": {
    "fieldA": "value"
  }
}
```

When action-proof is disabled by profile, implementations MAY accept reduced
input submission forms, but schema validation requirements still apply.

## 7. Assets / Binary Input

Binary/asset input handling is profile-dependent.

If a profile declares binary input support:

- schema MAY signal binary fields (for example via `format` or extension keys)
- runtime MUST preserve asset identity semantics through normalization/validation
- non-binary substitution MUST be rejected for binary-declared fields

### 7.1 Minimal Interoperable Binary Convention

To improve cross-runtime interoperability, implementations SHOULD support at
least one of:

- string asset reference (for example a stable upload token/id), or
- object reference of shape:

```json
{ "kind": "asset", "id": "asset_xxx" }
```

If object reference form is supported:

- `kind` MUST equal `"asset"`
- `id` MUST be non-empty string
- extra fields MAY exist but MUST NOT replace `kind`/`id` semantics

Implementations MUST reject plain non-binary values for fields explicitly
declared as binary/asset.

## 8. Conformance Checklist

An implementation conforming to this document MUST satisfy:

- input is interpreted as key-value object for action execution
- `input_schema` constraints are actually enforced
- invalid required/type/enum/additionalProperties cases are rejected
- normalization (if present) is constraint-preserving
- accepted input contract remains aligned with declared `input_schema`

## 9. Example

```json
{
  "id": "query_weather",
  "verb": "read",
  "target": "/",
  "transport": { "method": "GET" },
  "input_schema": {
    "type": "object",
    "required": ["location"],
    "properties": {
      "location": { "type": "string", "minLength": 1 },
      "range": { "type": "string", "enum": ["current", "today", "3d"] },
      "include_wind": { "type": "boolean" }
    },
    "additionalProperties": false
  }
}
```
