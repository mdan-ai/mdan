---
title: Quickstart
description: Create and run a TypeScript MDAN starter app, open it in a browser, and inspect the same interactive Markdown app, agent app, or online skill surface as a Markdown response for agents.
---

# Quickstart

Use this page when you want the shortest path from zero to a running MDAN agent
app.

The goal is simple:

1. generate a real TypeScript starter app
2. run it locally
3. open the browser view
4. inspect the Markdown response that agents read
5. understand what the generated files do

This page is only about getting the starter running. Make your first real edit
on [Customize The Starter](/customize-the-starter).

## Before You Start

You need one of these:

- Node.js with `npm`
- Bun

The generated starter runs as a normal local app. You do not need to understand
the full MDAN protocol before starting.

## 1. Create A Starter App

Node:

```bash
npm create mdan@latest agent-app
cd agent-app
npm install
npm start
```

Bun:

```bash
bunx create-mdan agent-app
cd agent-app
bun install
bun start
```

This creates a small project that already includes:

- `app/index.md`
- `app/index.action.json`
- `app/server.mjs`
- `index.mjs`

If you want a deeper file-by-file explanation after the app is running, read
[Customize The Starter](/customize-the-starter) next.

## 2. Open The App In Your Browser

Open:

```text
http://127.0.0.1:4321/
```

This is the running frontend entry. It boots browser UI, then fetches the
markdown surface for the requested route.

You should see a simple starter page with:

- the project title
- a short description of the starter flow
- a message feed block
- actions for refreshing and submitting a message

If the page does not load, first confirm the terminal is still showing the dev
server as running on `http://127.0.0.1:4321/`.

## 3. Inspect The Markdown View

In another terminal:

```bash
curl -H 'Accept: text/markdown' http://127.0.0.1:4321/
```

This is the same app as a Markdown response. It includes readable content and
the next actions the app exposes.

You should now see the MDAN surface directly:

- readable Markdown content
- the current message block content
- an embedded `mdan` block that declares the next actions

That Markdown response is the canonical read surface. The frontend entry reads
that same surface and renders browser UI from it.

## 4. Know What The Generated Files Are For

The starter is intentionally small.

The most important thing to notice is that the starter already uses one clear
three-part authoring model:

- `app/index.md`
  the shared readable page content
- `app/index.action.json`
  the explicit action JSON manifest for that page
- `app/server.mjs`
  the app definition, explicit manifest wiring, routes, actions, and page
  rendering logic
- `index.mjs`
  the local Node or Bun host entry

Think of those three files like this:

- `app/index.md`
  what the page says
- `app/index.action.json`
  what the page declares can happen next
- `app/server.mjs`
  how the runtime loads that page, binds state, and handles those declared
  actions

You do not need to edit anything yet. The point of this step is to see the
default starter working before you change it.

## 5. What You Just Proved

The starter demonstrates the core MDAN loop:

- one app serves markdown surfaces
- the browser entry consumes the same markdown surface
- actions are explicit instead of guessed
- every response can provide the next readable interaction context

## 6. Recommended Next Step

Continue to [Customize The Starter](/customize-the-starter).

That page picks up from this exact starter and walks through the first useful
change so you can understand how MDAN apps are actually edited.

## 7. Common First Issues

- port `4321` is already in use
  Start again with another port such as `PORT=4322 npm start` or
  `PORT=4322 bun start`.
- the browser opens but you do not know what is MDAN-specific
  Run the Markdown `curl` request first. That is where the shared app surface is
  easiest to understand.
- you are inside this SDK repository and do not want to scaffold a new app
  Use the maintainer workflow at the bottom of this page instead.

## 8. Other Useful Next Reads

- [Customize The Starter](/customize-the-starter)
  Make your first actual edit to the generated starter.
- [Troubleshooting](/troubleshooting)
  Use this if the starter does not behave the way this page says it should.
- [What is MDAN?](/what-is-mdan)
  Understand the model behind the starter.
- [Examples](/examples)
  See the other runnable examples.

## Working Inside This Repository

If you are working inside this SDK repository instead of creating a new app,
use the local example scripts:

```bash
npm install
npm run dev:starter
```

For maintainer commands and contribution guidance, see
[Contributing](/contributing).
