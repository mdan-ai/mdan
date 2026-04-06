---
title: What is MDAN?
description: What MDAN is, how it works, and why it fits interactive pages for both humans and agents.
---

# What is MDAN?

One page for humans and agents.

MDAN (Markdown Action Notation) is a shared notation for interactive pages that stay readable and actionable for both humans and agents, from the same source, across any interface.

Same page. Same actions. Same experience.

## What Makes It Different

In a typical AI product stack, page content, tool definitions, follow-up actions, and browser UI often live in separate layers.

MDAN pulls those pieces back into one readable and actionable page-shaped application surface:

- Markdown carries the content people and agents read
- executable operations are declared alongside that content
- server responses return Markdown fragments that can drive the next step
- the same app can negotiate Markdown for agents and HTML for browsers

## Who It Is For

MDAN is a strong fit for teams building:

- agent-facing apps
- internal tools that need both browser and agent access
- workflow or skills apps with multi-step page interaction
- docs-like or form-like products that should stay readable in source

## When To Use MDAN

Use MDAN when:

- one app needs to work well for both humans and AI agents
- you want a readable source format instead of splitting everything across templates, prompts, and JSON
- your interaction model is page-shaped and evolves step by step
- you want one server app to serve both Markdown and HTML from the same logic

## When Not To Use MDAN

MDAN is probably not the right fit when:

- your product is only a conventional browser app
- your backend is primarily a JSON API with no page-shaped interaction
- your UI depends on a large client-only state model
- you do not need an agent-readable interaction surface

## Node and Bun Support

MDAN officially supports Node and Bun.

- use Node if you want the most established host baseline
- use Bun if you want a Bun-native starter and toolchain entry
- keep the same app model in both cases

## Where To Start

- [Getting Started](/docs/getting-started)
- [Understanding MDAN](/docs/understanding-mdan)
- [HTTP Content Negotiation](/docs/shared-interaction)
- [SDK Overview](/docs/sdk)
