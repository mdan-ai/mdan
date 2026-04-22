---
title: MDAN Agent Content
description: Normative contract for shared readable content, semantic slots, agent-only blocks, and trust boundaries in MDAN surfaces.
---

# MDAN Agent Content

- Status: Draft
- Version: vNext

## 1. Scope

This document defines the normative content-layer contract for MDAN surfaces
shared between humans and agents.

It covers:

- shared readable Markdown content
- semantic slots
- agent-only blocks
- untrusted content boundaries

It does not define:

- a specific SDK validation API
- a specific browser rendering implementation
- a specific prompt style beyond the interoperable structures defined here

## 2. Shared Readability

An MDAN surface is a shared readable surface.

Conforming implementations:

- MUST preserve a readable Markdown body for agent-capable consumers
- MUST allow the same surface to carry content intended for both humans and
  agents
- MUST distinguish shared readable content from hidden agent-only content

## 3. Semantic Slots

Semantic slots are structured Markdown H2 sections used to stabilize prompt and
surface structure.

The current interoperable slot names are:

- `Purpose`
- `Context`
- `Rules`
- `Result`
- `Views`
- `Handoff`

Core slots:

- `Purpose`
- `Context`
- `Rules`
- `Result`

Optional interoperable extension slots:

- `Views`
- `Handoff`

When a profile enforces semantic-slot validation:

- slot headings MUST be H2 headings
- duplicate slot names MUST be rejected
- empty slot bodies MUST be rejected

## 4. Page And Region Slot Expectations

Profiles MAY impose different slot requirements on page surfaces and region
surfaces.

The current interoperable profile expectation is:

- full page surfaces use `Purpose`, `Context`, `Rules`, and `Result`
- region-oriented surfaces at minimum use `Context` and `Result`

These are profile constraints, not a requirement that every Markdown document
in the ecosystem always include the same slot set.

## 5. Agent Blocks

Agent blocks are agent-only content regions embedded in Markdown comments.

Interoperable form:

```md
<!-- agent:begin id="login_hint" -->
...agent-only Markdown...
<!-- agent:end -->
```

Conforming implementations:

- MUST require every `agent:begin` to be matched by one `agent:end`
- MUST require each agent block to have a non-empty unique `id`
- MUST reject empty agent block bodies
- MUST reject nested agent blocks

## 6. Projection Rules

Agent-only content and human-visible projections have different requirements.

Human-visible projections:

- MUST NOT render agent-only blocks as user-visible content

Agent-capable Markdown representations:

- MAY preserve agent-only blocks in the primary Markdown surface

This preserves the shared surface while preventing hidden instructions from
appearing in browser-facing human projections.

## 7. Untrusted Content

Some content regions may be declared untrusted.

The interoperable block declaration form is:

```md
::: block{id="comments" trust="untrusted"}
User-provided Markdown goes here.
:::
```

When a region is marked `trust="untrusted"`:

- implementations MUST treat its content as untrusted for validation-sensitive
  interpretation
- untrusted content MUST NOT satisfy host-authored semantic-slot requirements
- untrusted content MUST NOT be allowed to inject agent-only structural meaning
  into surrounding trusted content

## 8. Authoring Guidance

Use shared readable content for information that both humans and agents should
see.

Use agent blocks only for hidden agent guidance that should not appear in
human-visible projections.

Use semantic slots to stabilize prompt and interaction structure without
requiring a separate prompt channel.
