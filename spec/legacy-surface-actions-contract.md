---
title: Legacy Surface And Actions Contract
description: Compatibility contract for the legacy JSON surface bridge and action metadata.
---

# Legacy Surface And Actions Contract

This document defines the SDK-level contract for the legacy JSON surface bridge
and its action metadata. It is the practical validation contract still enforced
by the runtime before a compatibility surface is returned to clients that still
consume `application/json`.

For the broader product model, see `application-surface.zh.md`. For action
proof submission and signing, see `../docs/ACTION-PROOF-SECURITY.md`.

This is not the primary public MDAN response shape. The primary public contract
is the Markdown artifact described in `../docs/RUNTIME-CONTRACT.md` and
`../docs/2026-04-12-agent-consumption-contract.md`.

## Surface Envelope

Compatibility handlers may still return a legacy JSON surface envelope:

```ts
type JsonSurfaceEnvelope = {
  content: string;
  actions: ActionsContract;
  view?: {
    route_path?: string;
    regions?: Record<string, string>;
  };
};
```

`content` is Markdown. It may include frontmatter, block directives, semantic
slots, and agent blocks. When projected into the primary artifact contract, the
same readable body is paired with an embedded `mdan` fenced block for
executable state.

`actions` is the executable contract. It is not just display metadata; clients
and agents use it to decide what may be submitted next. In the artifact-native
direction, this contract belongs inside the Markdown artifact, but the runtime
still validates and projects it from this compatibility envelope when needed.

`view.route_path` is the semantic route for the returned surface. `view.regions`
contains named region Markdown used by browser/headless clients for block
updates.

## Actions Root

The `actions` object must include:

```ts
type ActionsContract = {
  app_id: string;
  state_id: string;
  state_version: number;
  blocks?: string[];
  actions: JsonAction[];
  allowed_next_actions?: string[];
  security?: {
    default_confirmation_policy?: "never" | "always" | "high-and-above";
  };
};
```

Required identity fields:

- `app_id` must be a non-empty string.
- `state_id` must be a non-empty string.
- `state_version` must be a finite number.
- `actions` must be an array, even when no actions are available.

`blocks` names the known block ids in the current surface. The adapter also
discovers block ids from `content` and `view.regions`, but authors should keep
`blocks` aligned with the visible interaction regions.

## Action Shape

Each action must be an object with a unique non-empty `id` and a non-empty
`target`.

```ts
type JsonAction = {
  id: string;
  label?: string;
  verb?: "navigate" | "read" | "write";
  target: string;
  transport?: {
    method?: "GET" | "POST";
  };
  input_schema?: {
    type?: "object";
    required?: string[];
    properties?: Record<string, unknown>;
    additionalProperties?: boolean;
  };
  state_effect?: {
    response_mode?: "page" | "region";
    updated_regions?: string[];
  };
  guard?: {
    risk_level?: string;
  };
  security?: {
    confirmation_policy?: "never" | "always" | "high-and-above";
  };
};
```

Validated action fields:

- `id` is required, non-empty, and unique within `actions.actions`.
- `target` is required and non-empty.
- `verb`, when present, must be `navigate`, `read`, or `write`.
- `transport.method`, when present, must be `GET` or `POST`.
- `state_effect.response_mode`, when present, must be `page` or `region`.
- `input_schema`, when present, must be an object.
- `input_schema.required`, when present, must be an array of strings.
- `input_schema.properties`, when present, must be an object.
- `security.confirmation_policy`, when present, must be `never`, `always`, or
  `high-and-above`.

`guard.risk_level` is consumed by UI semantics but is not currently restricted
by the core contract. Unknown values should be treated as display hints only.

## Content Blocks And Actions

Markdown content may bind actions to named blocks:

```md
::: block{id="composer" actions="submit_message,logout"}
Write a message.
:::
```

The SDK validates the relationship between content blocks and action ids:

- each parsed block id must be unique
- each action id listed in a block's `actions="..."` attribute must exist in
  `actions.actions`
- a block may not reference the same action id twice

This makes the block/action relationship a contract. The default adapter only
renders operations for actions referenced by the block being rendered.

## Allowed Next Actions

`actions.allowed_next_actions` is an allow-list for the current state.

When omitted, all block-referenced actions may be projected to clients. When
present:

- it must be an array of strings
- each id must exist in `actions.actions`
- clients should hide or disable actions not listed
- agents must not submit actions not listed

The default surface adapter filters block operations through
`allowed_next_actions`. An explicitly empty array means no action is executable
from the current surface, even if actions are present in `actions.actions`.

Use this for state gating, auth gating, multi-step flows, and error recovery
surfaces. Keep blocked actions in `actions.actions` only when clients still need
their shape for explanation or future transitions.

## Security Policy

The root security policy sets the default confirmation behavior:

```json
{
  "security": {
    "default_confirmation_policy": "high-and-above"
  }
}
```

An action can override it:

```json
{
  "id": "delete_project",
  "security": {
    "confirmation_policy": "always"
  }
}
```

Allowed policy values are:

- `never`: no SDK-level confirmation is required
- `always`: clients should require explicit confirmation
- `high-and-above`: clients should require confirmation for high-risk actions

Action proof uses this policy to determine whether a submitted request must
carry explicit confirmation. The policy does not replace application
authorization.

## Runtime Validation

`createMdanServer()` validates every non-stream legacy JSON surface before it
leaves the runtime:

- page handler results
- action handler results
- compatibility JSON responses
- browser shell bootstrap surfaces that still use the legacy bridge

If validation fails, the runtime returns a `500` error surface titled
`Actions Contract Violation`. The response representation follows normal
negotiation: compatibility JSON clients receive a JSON error surface, while
Markdown/HTML fallbacks receive Markdown where applicable.

Stream results are not legacy JSON surface envelopes and do not pass through
this contract validation. See `../docs/STREAMING.md`.

## Authoring Checklist

Before returning a surface:

- include `content`, `actions`, and `view.route_path`
- set stable `app_id`, meaningful `state_id`, and finite `state_version`
- give every action a unique `id` and concrete `target`
- choose `transport.method` explicitly for every action
- choose `state_effect.response_mode` explicitly for every action that changes
  the page or a region
- keep block `actions="..."` references aligned with `actions.actions`
- use `allowed_next_actions` as the current-state allow-list
- set root or action-level confirmation policy for risky operations
