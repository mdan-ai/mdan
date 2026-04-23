---
title: Agent Evaluation Contract
description: Contributor-focused contract for evaluating whether MDAN surfaces and examples remain naturally usable by general-purpose agents.
---

# Agent Evaluation Contract

The agent evaluation support under `test/agent-eval/` defines a lightweight
framework for checking whether MDAN surfaces are naturally usable by general
agents.

This is not a runtime API. It is a contributor and quality-system contract used
to evaluate SDK examples, fixtures, and interaction patterns.

## Goal

An eval case asks whether an agent can complete a task from:

- one URL
- one plain-language goal
- the page-exposed MDAN content and actions
- standard HTTP/browser behavior

Success must be proven by system evidence, not by the agent saying it finished.

## Assumption Levels

The current framework uses assumption levels:

- `A0`: no special assistance beyond the task and URL
- `A1`: light assistance that does not encode site-specific hidden steps
- `A2`: stronger hints or recovery guidance
- `A3`: task is reachable only with substantial help

Outcomes are interpreted relative to the assumption level reached.

## Eval Case

An eval case has:

```ts
type AgentEvalCase = {
  id: string;
  tier: "single-step" | "multi-step" | "cross-state";
  title: string;
  goal: string;
  url: string;
  prompt: string;
  tags: string[];
  assumptionLevels: AgentEvalAssumptionLevel[];
  timeoutMs: number;
  maxSteps: number;
  oracle: {
    business: string;
    ui: string;
    protocol: string;
  };
};
```

Required fields for new cases:

- `id`: stable machine-readable case id
- `tier`: fixture complexity class
- `title`: short human name
- `goal`: what the user wants done
- `url`: starting route
- `prompt`: one-sentence task prompt
- `oracle.business`: business-state success condition
- `oracle.ui`: visible or content-level success condition
- `oracle.protocol`: evidence that the agent used exposed MDAN actions

Defaults:

- `tags`: `[]`
- `assumptionLevels`: `["A0"]`
- `timeoutMs`: `120000`
- `maxSteps`: `20`

## Trace

A trace records what the probe or agent observed and what the system did.

Trace metadata:

```ts
type AgentEvalTraceMetadata = {
  runId: string;
  caseId: string;
  fixtureId: string;
  agentId: string;
  assumptionLevel: AgentEvalAssumptionLevel;
  startedAt: string;
};
```

Observation events represent what the agent could see:

```ts
type AgentEvalObservationEvent = {
  index: number;
  kind: "observation";
  at: string;
  url: string;
  contentSummary?: string;
  discoveredInputs?: string[];
  discoveredActions?: string[];
  discoveredErrors?: string[];
};
```

System events represent requests and state transitions:

```ts
type AgentEvalSystemEvent = {
  index: number;
  kind: "system";
  at: string;
  requestMethod: "GET" | "POST";
  requestTarget: string;
  requestBodyShape?: string;
  responseKind: "page" | "region" | "stream" | "error";
  updatedRegions?: string[];
  stateChangeSummary?: string;
};
```

Events are append-only and indexed in order.

## Oracle

Each run is judged by three oracle dimensions:

- `business`: did the underlying app state change as intended?
- `ui`: did the returned content or visible page show the intended result?
- `protocol`: did the agent use the page-exposed MDAN action path?

Each dimension returns:

```ts
type AgentEvalOracleResult = {
  passed: boolean;
  failureCategory?: AgentEvalFailureCategory;
  message?: string;
};
```

Failure categories:

- `discoverability_failure`
- `interaction_failure`
- `state_progression_failure`
- `result_interpretation_failure`
- `protocol_violation`
- `environment_failure`
- `agent_capability_limit`

Use the narrowest category that explains the first meaningful failure.

## Outcome

The framework maps oracle results and assumption level to:

- `PASS`: all oracle dimensions passed at `A0`
- `PASS_WITH_ASSIST`: all oracle dimensions passed at `A1`
- `REACHABLE_BUT_WEAK`: all oracle dimensions passed at `A2` or `A3`
- `FAIL`: at least one oracle dimension failed

The outcome also records the reached assumption level and failure category when
available.

## Fixture Tiers

`single-step`

One exposed action can complete the task. Example: submit one message.

`multi-step`

The agent must complete an ordered action sequence on one logical surface.
Example: preview a message, then confirm it.

`cross-state`

The agent must navigate or progress across states before completing the task.
Example: open a list item, then complete it from the detail page.

## Proof-Aware Submission

Fixtures discover actions from Markdown responses first, falling back to legacy
JSON surfaces where compatibility coverage is still needed. They use the same
adapter path as the browser runtime.

When an operation exposes `actionProof`, probe submissions wrap input as:

```json
{
  "action": {
    "proof": "<proof>"
  },
  "input": {
    "field": "value"
  }
}
```

When no proof is present, probes may submit the input object directly. This
keeps fixtures useful for both proof-enabled runtime flows and low-level
contract tests.

## Adding A Fixture

To add a fixture:

1. Define a case with `defineAgentEvalCase()`.
2. Create a `createMdanServer()` instance.
3. Return Markdown responses with valid embedded actions contracts, or legacy
   JSON surfaces where a compatibility fixture is intentional.
4. Include stable block ids and `allowed_next_actions`.
5. Add `seed()`, `reset()`, and state inspection helpers.
6. Add a verifier that returns business, UI, and protocol oracle results.
7. Add a probe runner that records observation and system trace events.
8. Add tests for case validation, probe execution, oracle behavior, and outcome
   mapping.

Good fixtures should be deterministic, resettable, and small enough that a
failure points to one interaction pattern.

## Current Fixtures

Current support includes:

- `single-step/submit-message`
- `multi-step/preview-confirm-message`
- `cross-state/list-detail-complete`

These fixtures cover the core agent-readiness path: discover an action, submit
proof-aware input, observe the resulting surface, and verify business/UI/protocol
evidence.
