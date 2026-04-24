---
title: Markdown Semantic Slot Authoring
description: Practical guidance for writing MDAN semantic slots in Markdown so both humans and agents can consume the same surface reliably.
---

# Markdown Semantic Slot Authoring

Use this guide when writing Markdown content for MDAN pages and regions.

Goal: make the same Markdown readable for humans and unambiguous for agents.

## Slot Model In The Current SDK

Page-level semantic slots (H2 headings):

- `## Purpose`
- `## Context`
- `## Rules`
- `## Result`

Optional slots:

- `## Views`
- `## Handoff`

Block/region-level semantic slots (recommended when region text is complex):

- `## Context`
- `## Result`

## Semantic Slot Isolation

Keep three layers isolated:

1. Page shared slots (`Purpose/Context/Rules/Result`)
These are the canonical shared contract for both human and agent readers.

2. Block/region slots (`Context/Result` inside dynamic regions)
These explain local region state only. Do not override page-level purpose/rules.

3. Agent-only slots (`agent:begin ... agent:end`)
These are hidden guidance for agent execution and must not be relied on by human-visible flow.

Isolation rules:

- Do not copy page-level `Rules` into every block region.
- Do not leak internal execution hints into shared page slots.
- Do not depend on agent-only blocks for correctness of human-visible page meaning.
- Keep cross-slot references explicit: if a block depends on page constraints, reference them briefly instead of duplicating all content.

For protocol details, see [Agent Content](/spec/agent-content).

## Authoring Principles

1. One slot, one job.
`Purpose` explains why this surface exists; do not mix execution steps into it.

2. Put runtime facts in `Context`.
Session state, current filters, selected location, and current route belong here.

3. Put hard constraints in `Rules`.
Use clear MUST/SHOULD language. Keep it executable, not narrative.

4. Put expected output shape in `Result`.
Describe what a correct response should contain, not internal implementation.

5. Keep slot content short and testable.
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

::: block{id="main" actions="refresh,submit"}
```

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

- Keep slot headings canonical in English (`Purpose/Context/Rules/Result`) for parser stability.
- Body content can be localized (`zh-CN`, `en-US`, etc.).
- If bilingual text is needed, keep one slot and place bilingual lines inside, instead of duplicating slots.

## Release Checklist

- Page includes `Purpose/Context/Rules/Result`.
- Slot headings are H2 (`##`) and unique.
- Rules are actionable and verifiable.
- Result describes observable output.
- No sensitive/internal-only guidance leaked outside `agent:begin`.

## Related Docs

- [Agent Content](/guides/agent-content)
- [Build Your First App](/build-your-first-app)
- [Application Structure](/application-structure)
