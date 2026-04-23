---
title: MDAN vs MCP
description: Compare MDAN and MCP, see how they complement each other, and learn when interactive pages fit better than tools alone.
---

# MDAN vs MCP

MDAN and MCP are both useful in AI systems, but they solve different layers of
the problem.

## What MCP Is Good At

MCP is a protocol for exposing tools, resources, and structured capabilities to
AI systems.

It is a good fit when you want to:

- expose tools to AI clients
- standardize how an assistant connects to external capabilities
- model integrations, resources, and tool calling

## What MDAN Is Good At

MDAN is a Markdown-first application surface model.

It is a good fit when you want to:

- serve both browsers and agents from the same app
- keep content and follow-up interaction in one readable page model
- return the next interaction context as a readable Markdown response
- negotiate Markdown for agents and HTML for browsers

## They Solve Different Layers

MCP is about exposing capabilities to AI clients.

MDAN is about expressing an interactive application surface that both humans
and agents can continue from.

In short:

- MCP is a tool and capability protocol
- MDAN is a shared interactive surface model

## When To Use Both Together

Use both when:

- an agent discovers or invokes capabilities through MCP
- but the actual workflow should live in a shared browser-and-agent app
- and you want that app to remain readable and actionable as Markdown

In that setup, MCP can help an AI system reach the right capability, while MDAN
can define the interactive surface the agent or human continues from.

## When MDAN Is The Better Fit

Choose MDAN first when your core problem is:

- building one app for both humans and agents
- keeping content and actions in one place
- modeling multi-step interaction as readable page or block updates

## When MCP Is The Better Fit

Choose MCP first when your core problem is:

- exposing tools or resources to external AI systems
- standardizing integration boundaries
- connecting assistants to many backends without defining a shared app surface

## Related Docs

- [What is MDAN?](/what-is-mdan)
- [Understanding MDAN](/understanding-mdan)
- [Quickstart](/getting-started)
