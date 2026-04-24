---
title: Action JSON
description: Understand the compiled action JSON produced by the App API and how to inspect it with page.actionJson().
---

# Action JSON

This page explains the concrete action JSON shape emitted by the App API.

Use it when you need to explain, debug, or validate the protocol-facing output
instead of only reading high-level `actions.route/read/write` declarations.

## Why This Exists

The App API is intentionally high-level. That improves authoring speed, but can
hide protocol details.

`page.actionJson()` is the inspection escape hatch:

- it returns compiled `actions` JSON
- it returns `allowed_next_actions`
- it lets you document and test the exact protocol payload

## Inspecting JSON

```ts
import { actions, createApp, fields } from "@mdanai/sdk";

const app = createApp();

const page = app.page("/", {
  markdown: "# Demo\n\n::: block{id=\"main\" actions=\"open,submit\"}",
  actions: [
    actions.route("open", {
      label: "Open docs",
      target: "/docs"
    }),
    actions.write("submit", {
      label: "Submit",
      target: "/submit",
      input: {
        message: fields.string({ required: true, minLength: 1 })
      }
    })
  ],
  render() {
    return { main: "- ready" };
  }
});

console.log(page.actionJson());
```

Example output:

```json
{
  "actions": [
    {
      "id": "open",
      "label": "Open docs",
      "verb": "route",
      "target": "/docs",
      "transport": { "method": "GET" },
      "input_schema": {
        "type": "object",
        "properties": {},
        "additionalProperties": false
      }
    },
    {
      "id": "submit",
      "label": "Submit",
      "verb": "write",
      "target": "/submit",
      "transport": { "method": "POST" },
      "input_schema": {
        "type": "object",
        "required": ["message"],
        "properties": {
          "message": { "type": "string", "minLength": 1 }
        },
        "additionalProperties": false
      }
    }
  ],
  "allowed_next_actions": ["open", "submit"]
}
```

## Field Meaning

- `id`: stable action id within the current state.
- `label`: user-facing label.
- `verb`: semantic intent (`route`, `read`, `write`).
- `target`: action target path.
- `transport.method`: current transport (`GET` or `POST` in current runtime).
- `input_schema`: JSON object-schema for action input.
- `allowed_next_actions`: allow-list for executable next actions.

## Notes

- `page.actionJson()` and `page.bind(...).actionJson()` return the same action manifest.
- This output is declaration-level compilation and does not include runtime proof
  fields like `action_proof`; those are added by runtime response handling.

## When You Will Actually Need This

Action JSON matters most when:

- you are debugging action behavior from `curl` or tests
- you are building a custom frontend and need the real action contract
- you are trying to understand why the runtime accepts or rejects an action
- you want to confirm how SDK field declarations compiled into `input_schema`

## Related Docs

- [Deep Dive](/deep-dive)
- [Input Schemas](/input-schemas)
- [API Reference](/api-reference)
- [Actions JSON Field Reference](/spec/action-json-fields)
