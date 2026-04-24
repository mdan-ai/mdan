---
title: What is MDAN?
description: Learn what MDAN is, how it works, and why it fits TypeScript agent apps, skills apps, online skills, and interactive Markdown apps shared by humans and agents.
---

# What is MDAN?

One interactive app surface for humans and agents.

Start with this page when you want the mental model before the code.

If you only want to see a running app, jump to [Quickstart](/quickstart) and
come back here after.

MDAN is a Markdown-first application surface model for building TypeScript
agent apps, skills apps, online skills, and interactive Markdown apps that stay
readable and actionable for both humans and agents from the same underlying
source.

If you are looking for a way to build one app that works as both a browser
experience and an agent-readable interface, this is the core MDAN idea.

In MDAN terms, an online skill is not just a tool call. It is a live,
interactive skill surface that stays readable to humans, executable by agents,
and continuable through declared actions.

If you want the dedicated definition of that idea, read
[Online Skills](/online-skills).

## In One Sentence

MDAN lets you build one app surface that browsers can render as HTML and
agents can read as Markdown.

In the current SDK, that means:

- Markdown is the canonical readable surface
- HTML is the browser projection of that same surface
- actions remain explicit and executable
- the server can keep returning the next readable interaction context

## What Makes It Different

In many AI product stacks, content, tool definitions, follow-up actions, and
browser UI drift into separate layers:

- one shape for prompts
- one shape for JSON APIs
- one shape for browser views
- one shape for agent tooling

MDAN pulls those concerns back toward one page-shaped interaction surface.

That surface can carry:

- content humans can read directly
- context agents can interpret directly
- explicit actions that continue the interaction
- enough shared structure for browsers and agents to stay in sync

## What Problem It Solves

MDAN is useful when the same workflow needs to work for both people and agents
without forcing you to maintain two separate interaction models.

Instead of treating a page as presentation only, MDAN treats it as shared
working context:

- a browser can open it as HTML
- an agent can read it as Markdown
- both can continue through declared actions

## When To Use MDAN

MDAN is a strong fit when:

- one app needs to work well for both humans and AI agents
- you want to expose online skills through a real app surface instead of only a
  tool endpoint
- your interaction model is page-shaped and multi-step
- you want content and actions to stay readable together
- you want one server app to negotiate Markdown for agents and HTML for browsers

## When Not To Use MDAN

MDAN is probably not the right fit when:

- you only need a conventional browser-only app
- your system is primarily a JSON API with no page-shaped interaction
- your UI depends on a very large client-only SPA state model
- you do not care about agent-readable interaction at all

## How The Current SDK Fits

The current TypeScript SDK gives you one default authoring path plus
secondary layers for specialization:

- `@mdanai/sdk` is the default app API for defining pages and actions
- `@mdanai/sdk/server/node` and `@mdanai/sdk/server/bun` host that app
- `@mdanai/sdk/surface` is the custom-frontend escape hatch
- `@mdanai/sdk/server` is the lower-level runtime layer
- the shipped default UI implementation stays internal to the SDK

That lets the same underlying app serve:

- `Accept: text/markdown` for agents and tests
- `Accept: text/html` for browser document reads

## Core Model

### Markdown Surface

In the current SDK, the canonical read surface is a Markdown response.

That Markdown surface can carry:

- the readable Markdown body
- block anchors or region structure
- executable MDAN state inside a fenced `mdan` block

The Markdown response is not only content. It is also the next interaction context.

### Actions Stay Explicit

MDAN does not ask clients to guess what to do next.

Instead, the server returns declared actions that describe:

- what can be done next
- where the operation targets
- how the request should be submitted
- what kind of state effect to expect

That is useful for both browser runtimes and agent consumers.

### Page And Region Updates

An interaction may return:

- a new page-level surface
- or a region-level update when only part of the current route changes

This lets the system stay readable while still supporting partial updates.

### Human And Agent Projections

The same underlying app can be consumed in two main ways:

- agents and tests prefer `text/markdown`
- browsers request `text/html`

The representation changes, but the app model does not.

## How Agents And Browsers Use It

An agent usually:

1. reads the Markdown response
2. discovers the available next actions
3. executes one declared action
4. reads the returned Markdown response
5. continues from the updated context

A browser loads the HTML projection of the same surface.

After the initial document load, the browser runtime can continue from the same
declared actions and update page or region state as needed.

In the current SDK, application code normally starts at `@mdanai/sdk`. If you
need to replace the frontend layer, the browser continuation behavior lives in
`@mdanai/sdk/surface`, while the shipped default UI layer remains an internal
SDK implementation detail.

## Why This Model Matters

- content and interaction stay close together
- agents do not need a separate guessed JSON workflow
- browsers do not need a second application model
- the server can keep driving both through the same declared next actions

## Where To Start Next

Read these next in order:

1. [Quickstart](/quickstart)
2. [Customize The Starter](/customize-the-starter)
3. [Examples](/examples)

Then use these when you want deeper context:

- [Online Skills](/online-skills)
- [Server Behavior](/server-behavior)
