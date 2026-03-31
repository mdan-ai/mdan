---
title: MDSN
description: What MDSN is, what problem it solves, and where to start.
---

# MDSN

MDSN is an interactive page format built on Markdown.

What it is trying to do is simple: bring page content, executable operations, and follow-up interaction back into the same application page.

In many AI apps, content, tools, prompts, JSON APIs, and browser UI end up spread across different layers.  
MDSN puts those pieces back into a single Markdown page.

**One Markdown page defines content, operations, and what can happen next.**

## What MDSN Is

MDSN is closer to an application expression format than a loose set of separate interfaces.

In MDSN, the page itself carries content, operations, and follow-up interaction:

- page content is written in Markdown
- executable operations are also defined in the page
- Markdown fragments returned by the server are not just results, but the next interaction context
- the same web app can be visited in a browser and used directly by an agent over HTTP

That makes MDSN a good fit for agent apps, skills apps, and page-shaped applications with ongoing multi-step interaction.

`@mdsnai/sdk` is the current reference implementation for this format and its host behavior.

## Why It Is Designed This Way

When the same app needs to serve both agents and people, splitting it into separate layers usually gets heavy fast:

- agents talk to one tool or JSON interface
- browsers talk to a different page and interaction model
- the server has to keep prompts, state, and follow-up actions in sync across both

MDSN lets the page itself carry that expression. As a result:

- agents can read Markdown directly and keep going from there
- agents can talk to the same web app over HTTP using tools like `curl`
- agents do not need a headless browser to imitate human page interaction
- browsers can keep using HTML without a second application model
- the server can keep driving follow-up interaction by returning Markdown fragments
- the app is less likely to drift across pages, protocols, tools, and UI

## How It Works

At a high level, MDSN works in three steps:

1. The page source uses Markdown to describe content and operations.
2. After an interaction happens, the server returns an updated Markdown fragment.
3. The agent or browser continues from that result.

For agents, the response is usually Markdown.  
For browsers, the response is usually HTML.

That is:

- `Accept: text/markdown` -> returns Markdown
- `Accept: text/html` -> returns HTML

What changes is the returned form, not the underlying app.

## Docs Guide

- Want to get something running in five minutes: [Getting Started](/docs/getting-started)
- Want to understand pages, blocks, and updates: [Understanding MDSN](/docs/understanding-mdsn)
- Want to understand how one app serves both agents and browsers: [HTTP Content Negotiation](/docs/shared-interaction)
- Want to start building a real app: [Application Structure](/docs/application-structure)
- Want to understand SDK boundaries: [SDK Overview](/docs/sdk)

## Recommended Reading Order

1. [Getting Started](/docs/getting-started)
2. [Understanding MDSN](/docs/understanding-mdsn)
3. [Application Structure](/docs/application-structure)
4. [SDK Overview](/docs/sdk)
