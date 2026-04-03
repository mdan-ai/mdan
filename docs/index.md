---
title: MDSN
description: MDSN is a Markdown-first framework for building apps that humans and AI agents can both use.
---

# MDSN

MDSN is a Markdown-first framework for building apps that humans and AI agents can both use.

It keeps content, operations, and follow-up interaction in the same page model.

That means one app can serve browsers and agents without splitting the interaction model across Markdown, prompts, JSON APIs, and UI glue.

## What MDSN Is

MDSN treats the page itself as the unit of application behavior.

In one page source, you can keep:

- page content is written in Markdown
- executable operations are also defined in the page
- Markdown fragments returned by the server are not just results, but the next interaction context
- the same web app can be visited in a browser and used directly by an agent over HTTP

That makes MDSN a good fit for agent apps, skills apps, internal tools, and page-shaped applications with ongoing multi-step interaction.

`@mdsnai/sdk` is the current reference implementation for this format and its host behavior.

## What Problem It Solves

When the same app needs to serve both agents and people, the architecture often drifts apart fast:

- agents talk to one tool or JSON interface
- browsers talk to a different page and interaction model
- the server has to keep prompts, state, and follow-up actions in sync across both

MDSN brings that back into one readable application surface. As a result:

- agents can read Markdown directly and keep going from there
- agents can talk to the same web app over HTTP using tools like `curl`
- agents do not need a headless browser to imitate human page interaction
- browsers can keep using HTML without a second application model
- the server can keep driving follow-up interaction by returning Markdown fragments
- the app is less likely to drift across pages, protocols, tools, and UI

## When To Use MDSN

MDSN is a strong fit when:

- the same app needs to work for both humans and AI agents
- your interaction model is naturally page-shaped and multi-step
- you want content and actions to stay readable together
- you want one server app to negotiate Markdown for agents and HTML for browsers

## When Not To Use MDSN

MDSN is probably not the right fit when:

- you only need a conventional browser-only app
- your application is mostly a JSON API with no page-shaped interaction
- your UI depends heavily on a large client-side SPA state model
- you do not care about agent-readable interaction at all

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
- Want a crisp definition and best-fit use cases: [What is MDSN?](/docs/what-is-mdsn)
- Want to compare MDSN with MCP: [MDSN vs MCP](/docs/mdsn-vs-mcp)
- Want the protocol-level definition behind MDSN Markdown responses: [Protocol v1](https://mdsn.ai/protocol/v1)
- Want to understand pages, blocks, and updates: [Understanding MDSN](/docs/understanding-mdsn)
- Want to understand how one app serves both agents and browsers: [HTTP Content Negotiation](/docs/shared-interaction)
- Want to start building a real app: [Application Structure](/docs/application-structure)
- Want to understand SDK boundaries: [SDK Overview](/docs/sdk)
- Want to see a real agent-to-agent app flow: [Agent App Demo](/docs/agent-app-demo)
- Want runnable repository demos: [Examples](/docs/examples)

## Recommended Reading Order

1. [Getting Started](/docs/getting-started)
2. [What is MDSN?](/docs/what-is-mdsn)
3. [Understanding MDSN](/docs/understanding-mdsn)
4. [Application Structure](/docs/application-structure)
5. [SDK Overview](/docs/sdk)
