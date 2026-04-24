---
title: Input Schemas
description: Practical guide to MDAN action input schemas, including how SDK field declarations map to JSON Schema and why runtime input validation fails.
---

# Input Schemas

Use this page when you are declaring action inputs or debugging why an action
request was rejected.

The current SDK lets you build object schemas with `fields.*(...)`, but the
runtime ultimately enforces an explicit object-shaped `input_schema`. This page
focuses on that practical mapping.

## Why This Matters

Once you move past the starter, action input becomes one of the first places
where development gets real:

- forms need declared fields
- `curl` or custom clients need the right request shape
- invalid input becomes a runtime `400`
- custom frontends need to know what inputs an action accepts

## The Development Model

You can author input schema like this:

```ts
const submitInputSchema = fields.object({
  message: fields.string({ required: true, minLength: 1 }),
  priority: fields.enum(["low", "high"])
}).schema;
```

You then place that schema directly into `actionJson.actions.<id>.input_schema`.

That means two views of the same thing exist:

- authoring-time field helpers in your app code
- runtime `input_schema` in the emitted action contract

When debugging, it helps to think in both layers.

## What The Runtime Expects

For JSON action submissions, use this shape:

```json
{
  "action": {
    "proof": "<server-issued proof>"
  },
  "input": {
    "message": "hello",
    "priority": "high"
  }
}
```

The runtime validates the `input` object against the declared schema.

## Common Mapping Rules

These are the practical rules most developers need first:

- `fields.string({ required: true })`
  becomes a required string field
- `fields.number(...)`
  becomes a numeric field
- `fields.boolean(...)`
  becomes a boolean field
- `fields.enum([...])`
  becomes a string field with an `enum`
- undeclared fields are rejected when `additionalProperties` is `false`

The emitted action JSON will carry those rules inside `input_schema`.

## What Usually Causes A `400`

Most local input-validation failures come from one of these:

- missing required field
- wrong field name
- wrong field type
- undeclared extra field
- stale or missing `action.proof`

Typical examples:

- sending `"priority": 1` when the action expects an enum string
- sending `"extra": true` when no such field is declared
- sending the field at the top level instead of inside `"input"`

## How To Debug A Real Input Contract

Use this pattern:

1. fetch the current Markdown response
2. inspect the current action contract
3. confirm the action id, target, and input shape
4. submit a request that matches the declared schema exactly

If you need to inspect the compiled contract directly in code, use
[Action JSON](/action-json).

## Example: From SDK Fields To Runtime Schema

Authoring code:

```ts
const submitSchema = fields.object({
  message: fields.string({ required: true, minLength: 1 }),
  done: fields.boolean(),
  category: fields.enum(["work", "personal"])
}).schema;
```

Representative runtime shape:

```json
{
  "type": "object",
  "required": ["message"],
  "properties": {
    "message": { "type": "string", "minLength": 1 },
    "done": { "type": "boolean" },
    "category": { "type": "string", "enum": ["work", "personal"] }
  },
  "additionalProperties": false
}
```

## Practical Rule

When you are authoring, think in `fields.*(...).schema`.

When you are debugging, think in `input_schema`.

That shift makes it much easier to understand why a client request succeeds or
fails.

## When To Read The Spec

This page is the practical developer guide.

Read the normative spec when you need stricter contract semantics around:

- normalization boundaries
- binary/asset inputs
- interoperability expectations across implementations

See [Input And Input Schema](/spec/input-and-schema).

## Related Docs

- [Action JSON](/action-json)
- [Troubleshooting](/troubleshooting)
- [Error Model And Status Codes](/spec/error-model)
- [Input And Input Schema](/spec/input-and-schema)
