---
title: Understanding MDAN
description: Understand the core MDAN model, including Markdown surfaces, actions, blocks, and how agents and browsers use the same app.
---

# Understanding MDAN

This page focuses on the core MDAN model, not on host integration details.

## Key Ideas

### 1. Markdown Surface

In the current SDK, the canonical read surface is a Markdown response.

That Markdown surface can carry:

- the readable Markdown body
- block anchors or region structure
- executable MDAN state inside a fenced `mdan` block

The Markdown response is not only content. It is also the next interaction context.

### 2. Actions Stay Explicit

MDAN does not ask clients to guess what to do next.

Instead, the server returns declared actions that describe:

- what can be done next
- where the operation targets
- how the request should be submitted
- what kind of state effect to expect

That is useful for both browser runtimes and agent consumers.

### 3. Page And Region Updates

An interaction may return:

- a new page-level surface
- or a region-level update when only part of the current route changes

This lets the system stay readable while still supporting partial updates.

### 4. Human And Agent Projections

The same underlying app can be consumed in two main ways:

- agents and tests prefer `text/markdown`
- browsers request `text/html`

The representation changes, but the app model does not.

## How Agents Use It

An agent usually:

1. reads the Markdown response
2. discovers the available next actions
3. executes one declared action
4. reads the returned Markdown response
5. continues from the updated context

That means the server is not only returning a result. It is continuously
returning the next readable and executable working surface.

## How Browsers Use It

A browser loads the HTML projection of the same surface.

After the initial document load, the browser runtime can continue from the same
declared actions and update page or region state as needed.

In the current SDK, application code normally starts at `@mdanai/sdk`.
If you need to replace the frontend layer, the browser continuation behavior
lives in `@mdanai/sdk/surface`, while the shipped default UI layer remains an
internal SDK implementation detail.

## Why This Model Matters

- content and interaction stay close together
- agents do not need a separate guessed JSON workflow
- browsers do not need a second application model
- the server can keep driving both through the same declared next actions

## Related Docs

- [What is MDAN?](/what-is-mdan)
- [Runtime Contract](/guides/runtime-contract)
- [Browser And Headless Runtime](/guides/browser-and-headless-runtime)
- [Spec Overview](/spec)
