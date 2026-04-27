---
title: Semantic Slots
description: Optional authoring guidance for writing MDAN Markdown surfaces that are easy for both humans and agents to read.
---

# Semantic Slots

Use this guide when you want a consistent authoring pattern for Markdown
content in MDAN pages and regions.

Semantic slots are not required by the core MDAN runtime contract. They are a
writing convention only. The SDK does not parse or validate these headings, and
apps may use other headings when they fit the product better.

Goal: make the same Markdown easier for humans to scan and easier for agents to
interpret.

## Optional Slot Model

Common page-level semantic slots (H2 headings):

- `## Purpose`
- `## Context`
- `## Rules`
- `## Result`

Optional slots:

- `## Examples`
- `## Views`
- `## Handoff`

Common block/region-level semantic slots when region text is complex:

- `## Context`
- `## Result`

These names are examples, not protocol keywords.

## Semantic Slot Isolation

Keep three layers isolated:

1. Page shared slots (`Purpose/Context/Rules/Result`)
These are a common shared authoring pattern for human and agent readers.

2. Block/region slots (`Context/Result` inside dynamic regions)
These explain local region state only. Avoid using them to override page-level
purpose/rules.

3. Agent-only slots (`agent:begin ... agent:end`)
These are hidden guidance for agent execution and must not be relied on by human-visible flow.

Isolation rules:

- Do not copy page-level `Rules` into every block region.
- Do not leak internal execution hints into shared page slots.
- Do not depend on agent-only blocks for correctness of human-visible page meaning.
- Keep cross-slot references explicit: if a block depends on page constraints, reference them briefly instead of duplicating all content.

For the runtime-relevant content boundary, see [Agent Content](/spec/agent-content).

## Authoring Principles

1. One slot, one job.
`Purpose` explains why this surface exists; do not mix execution steps into it.

2. Put runtime facts in `Context`.
Session state, current filters, selected location, and current route belong here.

3. Put hard constraints in `Rules`.
Use clear language. If you use MUST/SHOULD, reserve it for real app constraints.

4. Put expected output shape in `Result`.
Describe what this surface or region is expected to show, not internal
implementation.

5. Put common invocations in `Examples`.
Use this for sample paths, query strings, input objects, or command snippets that show how to call the declared actions.

6. Keep slot content short and testable.
Prefer short bullets/sentences over long prose.

## Recommended Writing Pattern

```md
# Page Title

## Purpose
Explain the single user/agent goal of this page.

## Context
List the current state that affects decisions.

## Rules
- Only use declared actions.
- Do not infer undeclared input fields.
- Keep locale and units consistent with current request.

## Result
Describe the expected output structure and success criteria.

## Examples
- `location=London`
- `/London/today`

<!-- mdan:block id="main" -->
```

Bind executable actions in the adjacent `*.action.json` file instead of relying
on prose. Markdown explains meaning; action JSON is the executable source of
truth.

For agent-only hidden guidance, use `agent:begin` blocks instead of polluting shared slots:

```md
<!-- agent:begin id="query_hint" -->
## Context
Use this hint only for action parameter normalization.

## Result
Return normalized inputs before submitting the action.
<!-- agent:end -->
```

## Anti-Patterns To Avoid

- Duplicating the same heading multiple times (`## Context` repeated).
- Putting action IDs or transport details in random prose instead of declared actions.
- Writing empty slots (heading exists but no useful content).
- Mixing hidden agent policy into human-visible slots when it should be in `agent:begin`.
- Using vague statements like “handle appropriately” with no observable rule.

## Multi-Language Guidance

- Keep slot headings consistent inside a project so authors and reviewers can scan pages quickly.
- Body content can be localized (`zh-CN`, `en-US`, etc.).
- If bilingual text is needed, keep one slot and place bilingual lines inside, instead of duplicating slots.

## Optional Checklist

- Use semantic slots only where they improve readability.
- Keep repeated headings intentional and easy to scan.
- Keep rules actionable and verifiable.
- Keep result text observable and user-facing.
- Use examples, when present, to show valid calls or inputs.
- Do not leak sensitive/internal-only guidance outside `agent:begin`.

## Related Docs

- [MDAN Agent Content](/spec/agent-content)
- [Deep Dive](/deep-dive)
- [Input Schemas](/input-schemas)
- [Customize The Starter](/customize-the-starter)
