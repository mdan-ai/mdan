---
title: MDAN vs MCP
description: Understand how MDAN and MCP differ, where they complement each other, and when to use each one.
---

# MDAN vs MCP

MDAN and MCP are related to AI apps, but they solve different layers of the problem.

## What MCP Is Good At

MCP is a protocol for exposing tools, resources, and structured capabilities to AI systems.

It is a good fit when you want to:

- expose tools to AI clients
- standardize how an assistant connects to external capabilities
- model integrations, resources, and tool calling

## What MDAN Is Good At

MDAN is a shared notation for interactive pages that stay readable and actionable for both humans and agents, from the same source, across any interface.

It is a good fit when you want to:

- serve both browsers and agents from the same app
- keep content and follow-up interaction in one readable page model
- return Markdown fragments that carry the next interaction context
- negotiate Markdown for agents and HTML for browsers

## They Solve Different Layers

MCP is about exposing capabilities to AI clients.

MDAN is about expressing an interactive application surface that both humans and agents can continue from.

In short:

- MCP is a tool and capability protocol
- MDAN is a notation for interactive pages and interactions

## When To Use Both Together

Use both when:

- an agent discovers or invokes capabilities through MCP
- but the actual user-facing workflow should live in a shared browser-and-agent app
- and you want the app itself to remain readable and executable as Markdown

In that shape, MCP can help an AI system reach the right capability, while MDAN can define the interactive page the agent or human continues from.

## When MDAN Is The Better Fit

Choose MDAN first when your core problem is:

- building one app for both humans and agents
- keeping page content and actions in one place
- modeling multi-step interaction as readable page updates

## When MCP Is The Better Fit

Choose MCP first when your core problem is:

- exposing tools or resources to external AI systems
- standardizing integration boundaries
- connecting an assistant to many backends without defining a user-facing app model

## Start Here

- [What is MDAN?](/docs/what-is-mdan)
- [Getting Started](/docs/getting-started)
- [HTTP Content Negotiation](/docs/shared-interaction)
