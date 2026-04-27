---
title: Agent Content
description: Historical notes on shared readable content, optional writing conventions, and agent-only blocks on top of the MDAN agent content spec.
---

# Agent Content

For normative protocol rules, see [Agent Content](/spec/agent-content).
For writing guidance, see [Semantic Slots](/semantic-slots).

This archived page describes an earlier authoring model for shared readable
content and agent-only blocks. Semantic slots are now only a project-level
writing convention; the SDK does not parse or validate them.

## Historical Semantic Slots

Semantic slots were Markdown H2 sections with names such as:

- `## Purpose`
- `## Context`
- `## Rules`
- `## Result`
- `## Views`
- `## Handoff`

These headings can still be useful as a team convention, but they are not SDK
protocol keywords and there is no runtime `semanticSlots` validation option.

## Current SDK Untrusted Blocks

Block anchors can mark a region as `trust="untrusted"` so hosts and UIs can
apply stricter handling to that region content (typically provided via
`actions.regions` / `regions`).

```md
::: block{id="comments" trust="untrusted"}
```

## Current SDK Agent Blocks

Agent blocks are HTML comments that carry agent-only instructions:

```md
<!-- agent:begin id="login_hint" -->
## Context
Use this block when deciding whether the user needs to sign in.

## Result
Submit the login action only when credentials are available.
<!-- agent:end -->
```

The SDK validates agent blocks on every returned surface:

- every `agent:begin` must have one `agent:end`
- each block must have a non-empty unique `id`
- block bodies must not be empty
- agent blocks may not nest

Human-visible projections strip agent blocks:

- browser shell snapshot HTML
- default UI rendering
- Markdown rendering helpers that call `stripAgentBlocks`

The primary Markdown response still includes the original Markdown content so
agent-capable clients can read the instructions directly. Legacy JSON
compatibility surfaces continue to carry that same content when compatibility
transport is needed.

## Recommended Authoring Pattern

Use semantic slots for page-level structure that both humans and agents can see.
Use agent blocks for hidden guidance that should not render in the browser UI.
When writing mixed page/block/agent content, keep slot isolation explicit (see
[Semantic Slots](/semantic-slots)).

For example:

```md
# Guestbook

## Purpose
Let signed-in users read and post guestbook messages.

## Context
The current session and message list are reflected in the blocks below.

## Rules
Only submit actions declared in the current surface.

## Result
A successful post appears at the top of the message list.

Add a message.

::: block{id="composer" actions="submit_message"}

<!-- agent:begin id="composer_prompt" -->
## Context
Use this block to submit a new message while signed in.

## Result
A valid submission adds a new message to the top of the feed.
<!-- agent:end -->
```
