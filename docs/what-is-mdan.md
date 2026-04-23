---
title: What is MDAN?
description: What MDAN is, how it works, and why it fits agent apps, skills apps, and interactive Markdown apps shared by humans and agents.
---

# What is MDAN?

One interactive app surface for humans and agents.

MDAN is a Markdown-first application surface model for building agent apps,
skills apps, and interactive Markdown apps that stay readable and actionable
for both humans and agents from the same underlying source.

If you are looking for a way to build one app that works as both a browser
experience and an agent-readable interface, this is the core MDAN idea.

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

The current TypeScript SDK now gives you one default authoring path plus
secondary layers for specialization:

- `@mdanai/sdk` is the default app API for defining pages and actions
- `@mdanai/sdk/server/node` and `@mdanai/sdk/server/bun` host that app
- `@mdanai/sdk/surface` is the custom-frontend escape hatch
- `@mdanai/sdk/server` is the lower-level runtime layer
- the shipped default UI implementation stays internal to the SDK

That lets the same underlying app serve:

- `Accept: text/markdown` for agents and tests
- `Accept: text/html` for browser document reads

## Where To Start Next

- [Quickstart](/getting-started)
- [Understanding MDAN](/understanding-mdan)
- [MDAN vs MCP](/mdan-vs-mcp)
- [Runtime Contract](/guides/runtime-contract)
