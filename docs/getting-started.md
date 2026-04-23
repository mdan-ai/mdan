---
title: Quickstart
description: Start a new MDAN app with create-mdan, run it locally, inspect both the browser HTML view and the canonical Markdown response, and know what to read next.
---

# Quickstart

This page is for first-time MDAN users.

If your goal is "I want to see a real MDAN app running as quickly as possible,"
start here. The fastest path is to scaffold a starter app, run it locally, open
it in a browser, and inspect the same app as a Markdown response.

## Fastest Path: Scaffold A New App

Node starter:

```bash
npm create mdan@latest agent-app
cd agent-app
npm install
npm start
```

Bun starter:

```bash
bunx create-mdan agent-app
cd agent-app
bun install
bun start
```

Then open:

```text
http://127.0.0.1:4321/
```

What you get:

- one runnable MDAN app
- one Markdown page at `app/index.md`
- one server file at `app/server.mjs`
- one local host entry for Node or Bun

## Confirm The Two Read Paths

MDAN apps are designed to serve:

- browser HTML for humans
- Markdown responses for agents and HTTP clients

After the starter is running, check both:

Browser view:

```bash
curl -H 'Accept: text/html' http://127.0.0.1:4321/
```

Canonical Markdown response:

```bash
curl -H 'Accept: text/markdown' http://127.0.0.1:4321/
```

That second request is the fastest way to see the core MDAN model in practice:
one readable Markdown surface plus explicit next actions.

## Make One Small Change

Edit:

```text
app/index.md
```

Then refresh the browser and run the Markdown `curl` again.

That gives you the real first-use loop:

1. change the page content
2. reload the browser
3. inspect the Markdown response

## Understand The Generated Shape

The generated starter keeps the moving pieces small:

- `app/index.md`
  readable page content
- `app/server.mjs`
  app definition, routes, actions, and render logic
- `index.mjs`
  local host entry for Node or Bun

You do not need to clone this SDK repo or learn the low-level runtime first to
try MDAN.

## What To Read Next

Pick the next page based on what you need:

- want the product model first: [What is MDAN?](/what-is-mdan)
- want to hand-build the same kind of app: [Build Your First App](/build-your-first-app)
- want to choose the right integration style: [Developer Paths](/developer-paths)
- want runnable reference apps: [Examples](/examples)
- want the supported package surface: [Public API](/reference/public-api)
- want the protocol side: [Spec Overview](/spec)

## If You Are Working In This Repository

If you are contributing to the SDK itself, not starting a new app, use the
repo-local workflow instead:

```bash
npm install
npm run dev:starter
```

Useful repo entry points:

- `npm run dev:starter`
- `npm run dev:docs-starter`
- `npm run dev:auth-guestbook`
- `npm run dev:weather-markdown`
- `npm run dev:docs-site`

For maintainer commands and contribution guidance, see
[Contributing](/contributing).
