# Agent Markdown Artifact Contract

Status: updated to reflect the current Markdown-first runtime baseline.

This document defines the primary runtime contract an agent should consume over HTTP.
The canonical response body is now a Markdown artifact. Action metadata travels inside
an embedded ````mdan` fenced JSON block, while `text/html` remains a human-facing
projection. `application/json` still exists for selected legacy handlers, but it is no
longer the preferred contract for agent reads.

## Model

```text
source authoring:
  content.md + actions.json

runtime interaction:
  Markdown artifact
    + Markdown body
    + ```mdan executable block

human projection:
  text/html

legacy compatibility:
  application/json
```

The readable body and the executable declaration remain separate concerns:

- Markdown is the content/prompt body an agent can read or forward directly.
- The embedded `mdan` block is the machine-readable declaration of actions and state.

Within the Markdown body:

- semantic slots (`## Purpose`, `## Context`, `## Rules`, `## Result`, etc.) define prompt structure
- `<!-- agent:begin ... --> ... <!-- agent:end -->` defines agent-only content that should not appear in human-visible UI

## Preferred Representation

Agents should request:

```http
Accept: text/markdown
```

The response body is a Markdown artifact. Browser clients may request `text/html` for
human rendering. `application/json` should be treated as a compatibility path for
legacy consumers, not the default protocol.

## Required Artifact Shape

Every interactive page or action response should be consumable as:

```md
---
route: "/login"
app_id: "auth-guestbook"
state_id: "auth-guestbook:login:1"
state_version: 1
---

# Sign In

...markdown body...

```mdan
{
  "app_id": "auth-guestbook",
  "state_id": "auth-guestbook:login:1",
  "state_version": 1,
  "blocks": ["login"],
  "actions": [...],
  "allowed_next_actions": ["login", "open_register"]
}
```
```

The Markdown body is the current readable surface.

The frontmatter may carry stable identity metadata such as:

- `route`
- `app_id`
- `state_id`
- `state_version`

The embedded `mdan` block must carry the executable contract:

```ts
type ArtifactActions = {
  app_id?: string;
  state_id?: string;
  state_version?: number;
  blocks?: string[];
  actions?: AgentAction[];
  allowed_next_actions?: string[];
};
```

Agents should treat `state_id` and `state_version` as the current stable state identity.
If `route` is present in frontmatter, it is the semantic current route after the
response.

## Action Shape

Each action should provide enough metadata for an agent to build the next request:

```ts
type AgentAction = {
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
  action_proof?: string;
  submit_format?: string;
  requires_confirmation?: boolean;
  submit_example?: Record<string, unknown>;
};
```

Agents should:

- pick actions by `id`
- verify the chosen id is present in `allowed_next_actions`
- submit to `target` using `transport.method` when present
- derive defaults when missing: `navigate/read -> GET`, `write -> POST`
- obey `input_schema.required`

For `POST`, the current baseline request body is:

```json
{
  "action": {
    "proof": "<operation.actionProof>"
  },
  "input": {
    "message": "hello"
  }
}
```

## Agent Consumption Flow

1. Request the current route with `Accept: text/markdown`.
2. Read the Markdown body as the current user-facing / agent-readable surface.
3. Parse the embedded ` ```mdan ` block.
4. Inspect `allowed_next_actions` before choosing any action.
5. Find the chosen action by `id` in `actions`.
6. Build inputs from the selected action's `input_schema`.
7. Submit to the action `target` using its declared method.
8. Preserve cookies between requests for session-backed apps.
9. Read the next artifact's frontmatter and `mdan` block to understand the resulting state.

## Errors

Runtime errors should still remain directly readable to an agent when the agent requests
Markdown:

- `400`: malformed request or invalid body
- `401`: login required or rejected credentials
- `404`: missing route
- `406`: unsupported response representation
- `415`: unsupported request content type
- `500`: runtime or handler failure

For Markdown-first flows, the agent should still parse the response body directly even if
no executable `mdan` block is present. The readable body remains the recovery surface.

## Current Baseline Notes

The current regression suite now proves:

- page reads through `text/markdown`
- action results through `text/markdown`
- action proof discovery through embedded `mdan` blocks
- session-backed flows such as `auth-guestbook` without depending on HTML or page-level JSON bootstrap

`application/json` remains valuable as a compatibility transport for legacy handlers and
selected internal tooling, but it is no longer the reference contract for agent-facing
app consumption.
