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

In the current app-authoring model, one page is usually split into three parts:

- `app/index.md`
  the readable Markdown surface
- `app/index.action.json`
  the explicit executable contract for that page
- `app.ts`
  the runtime that loads the page, binds state, and handles the declared
  actions

That split is the main reason this file exists at all. It keeps the declared
contract visible instead of hiding it inside runtime code.

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

## How It Connects To Runtime Code

The action manifest does not execute anything by itself.

It declares what the page exposes. Your runtime code in `app.ts` still needs to
register matching behavior with `app.route(...)`, `app.read(...)`, or
`app.action(...)`.

In practice that usually means:

- `actions.<id>.target` points at a real runtime path such as `/` or `/post`
- `transport.method` matches the handler shape you register
- `input_schema` matches the request body your handler expects
- `blocks.*.actions` only lists action ids that are actually defined under
  `actions`

If those pieces drift apart, the page may still render, but the action contract
you return will no longer match what the runtime can actually handle.

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

It also matters any time you need to answer one of these very practical
questions:

- which actions does this page actually expose right now
- which handler path is this button or form supposed to call
- why did a label change without the underlying target or schema changing
- why does the declared page contract not match the runtime behavior I expected

## Related Docs

- [Deep Dive](/deep-dive)
- [Input Schemas](/input-schemas)
- [API Reference](/api-reference)
- [Actions JSON Field Reference](/spec/action-json-fields)
