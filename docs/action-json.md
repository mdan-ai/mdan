---
title: Action JSON
description: Define explicit MDAN action JSON next to Markdown pages and inspect the runtime action contract.
---

# Action JSON

This page explains the concrete action JSON shape used by MDAN pages.

Use it when you need to define, debug, or validate the protocol-facing action
contract for a Markdown page.

## Why This Exists

An MDAN page is easiest to reason about when its readable Markdown and executable
contract are both visible in source control:

```txt
app/index.md
app/index.action.json
```

`page.actionJson()` returns the explicit action manifest for tests and
debugging.

## Explicit JSON

```ts
import { readFileSync } from "node:fs";
import { MDAN_PAGE_MANIFEST_VERSION, createApp, type MdanActionManifest } from "@mdanai/sdk";

const app = createApp();
const markdown = readFileSync("app/index.md", "utf8");
const actionJson = JSON.parse(readFileSync("app/index.action.json", "utf8")) as MdanActionManifest;

if (actionJson.version !== MDAN_PAGE_MANIFEST_VERSION) {
  throw new Error("Unexpected manifest version.");
}

const page = app.page("/", {
  markdown,
  actionJson,
  render() {
    return { main: "- ready" };
  }
});

console.log(page.actionJson());
```

Example output:

```json
{
  "version": "mdan.page.v1",
  "app_id": "demo",
  "state_id": "demo:index",
  "state_version": 1,
  "blocks": {
    "main": {
      "trust": "untrusted",
      "actions": ["open", "submit"]
    }
  },
  "actions": {
    "open": {
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
    "submit": {
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
  }
}
```

## Field Meaning

- `blocks`: block ids and their executable action ids.
- `actions`: action definitions keyed by stable action id.
- `label`: user-facing label.
- `verb`: semantic intent (`route`, `read`, `write`).
- `target`: action target path.
- `transport.method`: current transport (`GET` or `POST` in current runtime).
- `input_schema`: JSON object-schema for action input.

## Notes

- `page.actionJson()` and `page.bind(...).actionJson()` return the same action manifest.
- `MDAN_PAGE_MANIFEST_VERSION` and `MdanActionManifest` are exported from `@mdanai/sdk`
  so explicit `.action.json` files can be typed without reaching into internal paths.
- Source action JSON does not include runtime proof
  fields like `action_proof`; those are added by runtime response handling.
- `allowed_next_actions` is no longer needed. The executable action set is
  derived from `blocks.*.actions`.

## When You Will Actually Need This

Action JSON matters most when:

- you are debugging action behavior from `curl` or tests
- you are building a custom frontend and need the real action contract
- you are trying to understand why the runtime accepts or rejects an action
- you want to confirm how your declared `input_schema` will be exposed at runtime

## Related Docs

- [Deep Dive](/deep-dive)
- [Input Schemas](/input-schemas)
- [API Reference](/api-reference)
- [Actions JSON Field Reference](/spec/action-json-fields)
