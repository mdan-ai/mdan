---
title: What is MDSN?
description: Understand what MDSN is, who it is for, and when to use it.
---

# What is MDSN?

MDSN is a Markdown-first framework for building apps that humans and AI agents can both use.

It keeps content, operations, and follow-up interaction in the same page model so one app can serve both browsers and agents.

## What Makes It Different

In a typical AI product stack, page content, tool definitions, follow-up actions, and browser UI often live in separate layers.

MDSN pulls those pieces back into one readable page-shaped application surface:

- Markdown carries the content people and agents read
- executable operations are declared alongside that content
- server responses return Markdown fragments that can drive the next step
- the same app can negotiate Markdown for agents and HTML for browsers

## Who It Is For

MDSN is a strong fit for teams building:

- agent-facing apps
- internal tools that need both browser and agent access
- workflow or skills apps with multi-step page interaction
- docs-like or form-like products that should stay readable in source

## When To Use MDSN

Use MDSN when:

- one app needs to work well for both humans and AI agents
- you want a readable source format instead of splitting everything across templates, prompts, and JSON
- your interaction model is page-shaped and evolves step by step
- you want one server app to serve both Markdown and HTML from the same logic

## When Not To Use MDSN

MDSN is probably not the right fit when:

- your product is only a conventional browser app
- your backend is primarily a JSON API with no page-shaped interaction
- your UI depends on a large client-only state model
- you do not need an agent-readable interaction surface

## Node and Bun Support

MDSN officially supports Node and Bun.

- use Node if you want the most established host baseline
- use Bun if you want a Bun-native starter and toolchain entry
- keep the same app model in both cases

## Where To Start

- [Getting Started](/docs/getting-started)
- [Understanding MDSN](/docs/understanding-mdsn)
- [HTTP Content Negotiation](/docs/shared-interaction)
- [SDK Overview](/docs/sdk)
