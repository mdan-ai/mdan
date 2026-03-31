---
title: Understanding MDSN
description: Understand pages, blocks, fragment updates, and how agents and browsers use the same MDSN app.
---

# Understanding MDSN

This page focuses on the core MDSN model, not on integration details.

## Key Ideas

### 1. Page Source

An MDSN page usually contains:

- frontmatter
- a Markdown body
- one executable `mdsn` code block

In other words, the page content and the interaction defined for that page live in the same place.

### 2. Block

A `BLOCK` is a part of the page that can be updated on its own.

It is inserted back into the body through anchors such as `mdsn:block <name>`.  
When that part changes at runtime, the system only needs to update that block instead of returning the whole page again.

### 3. Fragment Updates

A successful read or write usually does not return the whole page. It returns the Markdown fragment for the current block.

That fragment usually carries more than just refreshed content. It also carries the operations that can continue from there.

So for an agent, the response is not just a result to glance at. It is the working surface for the next step.

## How Agents and Browsers Use It

MDSN supports both agents and browsers, but they use the same app.

### Agent

An agent first reads the full page Markdown to understand the current content and available operations.

After it executes one target, the returned Markdown fragment usually carries two things:

- the updated content for the current step
- what can be done next, or how the interaction should continue

That means the server is not only returning a result to the agent. It is continuously providing the next readable and executable interaction context.

### Browser

When a browser visits the same app, it requests HTML. After the page loads, the browser runtime takes over follow-up interaction and updates blocks or page state as needed.

## Why This Model Matters

- content and interaction live in the same page source
- agents do not need a separate JSON interface
- browsers do not need a second interaction definition for the same app
- the server can keep driving agent interaction through Markdown fragments
- most updates only need to return local fragments instead of the whole page

## Related Docs

- [Getting Started](/docs/getting-started)
- [HTTP Content Negotiation](/docs/shared-interaction)
- [Application Structure](/docs/application-structure)
