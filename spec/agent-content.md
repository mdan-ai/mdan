---
title: MDAN Agent Content
description: Normative contract for shared readable content, agent-only blocks, trust boundaries, and optional semantic slot guidance in MDAN surfaces.
---

# MDAN Agent Content

- Status: Draft
- Version: vNext

## 1. Scope

This document defines the content-layer contract for MDAN surfaces shared
between humans and agents.

It covers:

- shared readable Markdown content
- optional semantic-slot guidance
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

Semantic slots are structured Markdown H2 sections that may be used to
stabilize prompt and surface structure.

They are an optional authoring profile, not a required part of the MDAN runtime
contract.

The current interoperable slot names are:

- `Purpose`
- `Context`
- `Rules`
- `Result`
- `Examples`
- `Views`
- `Handoff`

Common page slots:

- `Purpose`
- `Context`
- `Rules`
- `Result`

Optional interoperable extension slots:

- `Examples`
- `Views`
- `Handoff`

When an implementation or project profile explicitly enables semantic-slot
validation:

- slot headings MUST be H2 headings
- duplicate slot names MUST be rejected
- empty slot bodies MUST be rejected

## 4. Page And Region Slot Expectations

Profiles MAY impose different slot requirements on page surfaces and region
surfaces.

The current built-in SDK guidance profile checks:

- full page surfaces use `Purpose`, `Context`, `Rules`, and `Result`
- region-oriented surfaces at minimum use `Context` and `Result`

These are optional profile constraints, not a requirement that every MDAN
surface always include the same slot set.

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

Use semantic slots when they stabilize prompt and interaction structure without
forcing an awkward page shape. Prefer ordinary product-specific headings when
they make the human-facing surface clearer.
