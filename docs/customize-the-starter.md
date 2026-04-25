---
title: Customize The Starter
description: Build your first real MDAN agent app change by editing the generated Markdown page, explicit action JSON manifest, and app runtime code, then verify the browser and Markdown outputs.
---

# Customize The Starter

This guide picks up where [Quickstart](/quickstart) ends.

Use it when the generated starter is already running and you want to make your
first real app change.

This is the first place where the starter stops being a demo you can run and
starts becoming a TypeScript agent app you understand.

By the end, you will have:

- one page edited in `app/index.md`
- one manifest edited in `app/index.action.json`
- one action handler edited in `app/server.mjs`
- one changed browser view
- one changed Markdown response

## 1. Start From The Generated App

If you have not created the starter yet, run [Quickstart](/quickstart)
first.

You should already have this shape:

```text
app/
  index.md
  index.action.json
  server.mjs
index.mjs
```

Keep the dev server running while you edit:

```bash
npm start
```

or:

```bash
bun start
```

## 2. Understand The Generated Files

The starter keeps the important pieces small:

- `app/index.md`
  readable page content shared across browser and Markdown clients
- `app/index.action.json`
  explicit executable action contract for that page
- `app/server.mjs`
  app definition, routes, actions, and render logic
- `index.mjs`
  Node or Bun host entry that calls `app.host(...)`

For this first pass, only touch `app/index.md`, `app/index.action.json`, and
`app/server.mjs`.

Leave `index.mjs` alone for now. The generated starter already uses the default
app-facing host path:

- `app.host("node" | "bun", { frontend: true })`

## 3. The Three-Part Authoring Model

Think of those files as three different layers:

- `app/index.md`
  the shared readable surface for both browsers and agents
- `app/index.action.json`
  the explicit executable contract attached to that page
- `app/server.mjs`
  the runtime behavior that fills that surface with current state and handles
  actions

That split is the main thing to understand in this guide.

The shortest way to remember it is:

- `app/index.md`
  what the page says
- `app/index.action.json`
  what the page declares can happen next
- `app/server.mjs`
  how the runtime loads that page, binds current state, and handles those
  declared actions

If you understand that split, the rest of the starter will stop feeling like a
random set of files.

## 4. Edit The Shared Page Surface

Open `app/index.md` and change the title and page purpose:

```md
# My First MDAN App

## Purpose
Show a small shared app for both browser users and agents.

## Context
This page shows the current message feed.

## Rules
Submit only actions declared by the current surface.

## Result
The latest messages appear below.

<!-- mdan:block id="main" -->
```

Refresh the browser after saving.

What changed here:

- you changed the readable page content
- you did not change how messages are loaded or submitted
- both browser users and agent clients will see this new wording

This is the MDAN surface layer.

## 5. Edit The Action Contract And Runtime Behavior

Open `app/index.action.json`.

The generated starter keeps action declarations explicit in JSON:

- `blocks.*.actions`
- `actions.<id>`
- `input_schema`

Change the submit label there:

```json
{
  "actions": {
    "submit_message": {
      "label": "Post update"
    }
  }
}
```

Then open `app/server.mjs`.

The generated starter already uses the current App API:

- `createApp(...)`
- `app.page(...)`
- `app.route(...)`
- `app.action(...)`

The generated starter runtime follows the same current app-authoring model used
throughout this repository: it reads `app/index.md`, reads
`app/index.action.json`, passes that manifest into `app.page(...)`, and binds
current state with `page.bind(...)`.

First change the initial message list so the app is clearly yours:

```js
export function createAppServer(initialMessages = [
  "Hello from my first MDAN app"
]) {
```

Reload the browser and confirm the UI text changed.

What changed here:

- you changed the initial state returned by the server
- you changed the declared action label in `app/index.action.json`
- you still did not build a separate browser-only UI

This is the runtime layer. It decides what the surface can do and what data it
returns next.

## 6. Verify The Markdown Response

Check that the same change appears in the Markdown response:

```bash
curl -H 'Accept: text/markdown' http://127.0.0.1:4321/
```

You should see:

- the page Markdown
- the current rendered message content
- the embedded `mdan` action block

That Markdown response is the core MDAN surface.

This is the important checkpoint in the whole guide:

- your `app/index.md` edit changed the readable surface
- your `app/server.mjs` edit changed the current state and action metadata
- the Markdown response shows both of those changes together

That is the real MDAN model: page content and executable actions stay close
together in one returned surface.

## 7. Optional: Submit A Real Action From The CLI

First fetch the current Markdown response and copy the `action_proof` for
`submit_message` from the embedded `mdan` block.

Then submit the action:

```bash
curl -X POST \
  -H 'Accept: text/markdown' \
  -H 'Content-Type: application/json' \
  -d '{"action":{"proof":"<proof>"},"input":{"message":"hello from curl"}}' \
  http://127.0.0.1:4321/post
```

Use the real `action_proof` from the current response when action proof is
enabled.

What this step proves:

- the browser flow is not special-cased
- the same declared action can also be executed from a client reading Markdown
- the server keeps returning the next readable state after each action

## 8. What You Just Learned

You changed a real MDAN starter app at the two layers that matter most:

- the shared page surface in `app/index.md`
- the explicit action contract in `app/index.action.json`
- the runtime behavior in `app/server.mjs`
- the browser and Markdown outputs changed together because they come from the
  same app model

## 9. What To Read Next

- [Examples](/examples)
- [Deep Dive](/deep-dive)
- [Troubleshooting](/troubleshooting)
- [SDK Packages](/sdk-packages)
- [Action JSON](/action-json)
