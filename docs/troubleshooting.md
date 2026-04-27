---
title: Troubleshooting
description: Fix the most common MDAN starter and local development problems, including startup issues, browser vs Markdown confusion, action proof failures, and representation mismatches.
---

# Troubleshooting

Use this page when the starter app does not behave the way the docs say it
should.

This is a practical debugging page for local development. It focuses on the
problems developers usually hit first, not on the full protocol contract.

## First Checks

Before debugging deeper issues, confirm these basics:

- your app process is still running
- you are opening the same port the server printed in the terminal
- browser reads use `http://127.0.0.1:<port>/`
- Markdown checks use `curl -H 'Accept: text/markdown' http://127.0.0.1:<port>/`

If those checks do not match, fix them first.

## The Starter Will Not Start

### Symptom

The app exits immediately, or nothing is listening on `http://127.0.0.1:4321/`.

### Most Common Causes

- dependencies were not installed
- port `4321` is already in use
- you are trying to run the repository maintainer commands inside a generated app
- you are trying to run generated-app commands inside this SDK repository

### What To Do

For a generated app:

```bash
npm install
npm start
```

or:

```bash
bun install
bun start
```

If the port is already in use:

```bash
PORT=4322 npm start
```

or:

```bash
PORT=4322 bun start
```

If you are working inside this SDK repository instead of a generated app, use
the local example workflow described in [Quickstart](/quickstart).

## The Browser Loads, But I Do Not Understand What Is MDAN-Specific

### Symptom

You can open the page in the browser, but it just looks like a normal page and
it is not clear what part is the shared MDAN model.

### What Is Happening

The browser is showing a UI built from the markdown surface.

MDAN becomes easiest to see when you inspect the Markdown response directly:

```bash
curl -H 'Accept: text/markdown' http://127.0.0.1:4321/
```

### What To Look For

- readable Markdown content
- a block region such as the current message feed
- an embedded `mdan` block with the declared next actions

If you can see those pieces, the app is behaving as expected.

## The Markdown Response Does Not Match The Browser

### Symptom

You changed the starter, refreshed the browser, and the Markdown output still
looks old, or the browser changed but the Markdown response seems confusing.

### What Is Usually Happening

- you changed `app/index.md` but are expecting runtime state to change too
- you changed `app/server.mjs` or `app/index.action.json` but are only checking the
  browser page copy
- you are reading a different route or port than the browser

### What To Do

Check both of these after every edit:

```bash
curl -H 'Accept: text/markdown' http://127.0.0.1:4321/
```

and:

```text
http://127.0.0.1:4321/
```

Remember the split:

- `app/index.md` changes the shared readable surface
- `app/index.action.json` changes the declared action contract
- `app/server.mjs` changes state, action handling, and returned runtime data

If you want a guided walkthrough of that split, use
[Customize The Starter](/customize-the-starter).

## A POST Action Returns `400`

### Symptom

You submit an action from `curl` and get a `400 Bad Request`.

### Most Common Causes

- missing `action.proof`
- stale `action.proof` copied from an older response
- request body shape does not match the declared input schema
- extra undeclared fields were sent

### What To Do

Fetch a fresh Markdown response first:

```bash
curl -H 'Accept: text/markdown' http://127.0.0.1:4321/
```

Then copy the current `action_proof` for the action you are submitting and send
it in this shape:

```bash
curl -X POST \
  -H 'Accept: text/markdown' \
  -H 'Content-Type: application/json' \
  -d '{"action":{"proof":"<proof>"},"input":{"message":"hello"}}' \
  http://127.0.0.1:4321/post
```

If the input field names or types do not match the declared action input, the
runtime will still reject the request.

For the full error model, see [Error Model And Status Codes](/spec/error-model).

## A POST Action Returns `406 Not Acceptable`

### Symptom

The action request succeeds structurally, but the runtime returns `406 Not
Acceptable`.

### Cause

You likely requested the wrong representation for an action response.

MDAN action requests should normally use:

```http
Accept: text/markdown
```

Do not request `text/html` or `application/json` for a normal MDAN action POST.
If you need a traditional JSON endpoint, register it separately with
`app.api(...)`.

### What To Do

Send:

```bash
curl -X POST \
  -H 'Accept: text/markdown' \
  -H 'Content-Type: application/json' \
  -d '{"action":{"proof":"<proof>"},"input":{"message":"hello"}}' \
  http://127.0.0.1:4321/post
```

Use `text/event-stream` only for stream actions.

## I Asked For HTML From The Wrong Place

### Symptom

You are testing the runtime directly and expecting every request to support
`Accept: text/html`.

### What Is Happening

The current server runtime does not return HTML at all. HTML is a frontend
projection built from the returned markdown surface.

### Practical Rule

- page read: use `Accept: text/markdown`
- action read/write: use `Accept: text/markdown`
- stream action: use `Accept: text/event-stream`

If you want browser UI, consume the markdown surface in the frontend layer
instead of asking the server for HTML.

### What To Do

- in a generated app, use the normal starter commands from the generated project
- in this SDK repository, use the provided `dev:*` scripts because they build
  and watch the required browser bundles for local development

If you are working inside the SDK repository, do not replace the example dev
scripts with ad hoc commands unless you also handle the browser bundle build.

## I Am Not Sure Which Doc To Read Next

Use this rule:

- app runs but you do not understand the model: [What is MDAN?](/what-is-mdan)
- app runs and you want to make the first real change: [Customize The Starter](/customize-the-starter)
- starter is clear and you want a closer example: [Examples](/examples)
- you are debugging response codes or request shape: [Error Model And Status Codes](/spec/error-model)
- you are debugging browser/runtime expectations: [Browser Behavior](/browser-behavior) and [Server Behavior](/server-behavior)
