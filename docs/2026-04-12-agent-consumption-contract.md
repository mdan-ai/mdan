# Agent Surface Bundle Contract

Status: implemented baseline for the agent-consumption stability milestone.

This document defines the JSON surface bundle an agent or frontend SDK should be able to consume directly over HTTP without relying on server-rendered HTML, browser DOM scraping, or example-specific routing conventions.

## Model

MDAN source authoring can remain split into Markdown content templates and JSON action contracts. Runtime interaction should use a bundled representation so consumers do not need to fetch and merge multiple files.

```text
source authoring:
  content.md + actions.json

runtime interaction:
  SurfaceBundle JSON

readable/debug output:
  text/markdown

legacy adapter:
  server-rendered text/html
```

The bundle is a transport/runtime representation. `content` remains Markdown-as-content/prompt, while `actions` remains the executable truth.

Within `content` and `view.regions`, prompt structure and prompt visibility are separate concerns:

- semantic slots (`## Purpose`, `## Context`, `## Rules`, `## Result`, etc.) define prompt structure
- `<!-- agent:begin ... --> ... <!-- agent:end -->` defines agent-only content that should not appear in human-visible UI

These two systems are independent. Semantic slots do not require agent blocks, and agent blocks do not define semantic-slot validity.

## Preferred Representation

Agents should request:

```http
Accept: application/json
```

The response body is a JSON surface bundle. Browser clients should also move to this representation through the frontend SDK. Protocol/debug clients may request `text/markdown` for readable content only.

The SDK runtime negotiates `application/json` for page and action handlers that return surface bundles. This keeps `content`, `actions`, and `view` available without requiring HTML bootstrap scraping.

## Required Bundle

Every interactive response must include:

```ts
type SurfaceBundle = {
  content: string;
  actions: {
    app_id: string;
    state_id: string;
    state_version: number;
    blocks: string[];
    actions: AgentAction[];
    allowed_next_actions: string[];
  };
  view: {
    route_path: string;
    regions?: Record<string, string>;
  };
};
```

`content` is the agent-readable page body. It may include frontmatter, block directives, agent-only blocks, and Markdown prose.

`actions.app_id` identifies the application namespace.

`actions.state_id` identifies the current logical state. Agents should treat a changed `state_id` as a state transition.

`actions.state_version` is a monotonically meaningful version for the state. Agents should not assume versions are globally sequential across routes.

`actions.blocks` lists known block ids for the current surface.

`actions.actions` lists every action known to the current surface, including actions that may be currently disabled.

`actions.allowed_next_actions` is the allow-list agents must use before taking an action. If an action id is not in this list, the agent should not call it.

`view.route_path` is the semantic current page route after the response. Agents should treat it as the route to show, remember, or revisit, not necessarily the endpoint that produced the response.

If `view.regions` is present, each region may also carry local prompt structure. Current SDK baseline conventions are:

- page content may require `Purpose`, `Context`, `Rules`, and `Result`
- block/region content may require `Context` and `Result`
- agent-only blocks are globally validated on every returned surface and stripped from human-visible HTML/UI projections

## Action Shape

Each action should provide enough metadata for an agent to construct the next HTTP request:

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
};
```

Agents should select actions by `id`, then verify the id is present in `allowed_next_actions`.

Agents should submit to `target` using `transport.method` when present. If `transport.method` is absent, `navigate` and `read` imply `GET`; `write` implies `POST`.

Agents should construct payloads from `input_schema.properties`. Fields listed in `input_schema.required` must be supplied. If `additionalProperties` is `false`, agents should not send undeclared fields.

For `POST`, agents should send JSON request bodies. The currently supported body shape is the flat input object:

```json
{ "message": "hello" }
```

When action-proof mode is enabled, the SDK may require a wrapped `{ "action": ..., "input": ... }` body; that mode is not the baseline contract for this milestone.

## Agent And Frontend Consumption Flow

1. Request the current route with `Accept: application/json`.
2. Read `view.route_path` as the semantic current route.
3. Inspect `actions.allowed_next_actions` before choosing any action.
4. Find the selected action by `id` in `actions.actions`.
5. Build the input payload from the selected action's `input_schema`.
6. Submit to the action's `target` using `transport.method` or the verb-derived default.
7. Preserve cookies between requests so session-backed apps remain coherent.
8. Read the next response's `view.route_path`, `actions.state_id`, and `actions.state_version` to understand the resulting state.
9. If the status is non-2xx, still parse the JSON bundle and use its `content`, route, and allowed actions to recover.

## Errors

Agent-readable errors should satisfy the same response-negotiation rule:

- `400`: malformed body, invalid fields, or validation error.
- `401`: login required or rejected credentials.
- `404`: no matching route or action endpoint.
- `406`: requested representation is not supported.
- `415`: unsupported request content type.
- `500`: handler/runtime failure.

For this milestone, errors may expose no allowed actions, but they should remain machine readable when the agent requested JSON.

Example-backed auth errors currently return full login/register surfaces with useful `allowed_next_actions`, so agents can recover by selecting a login or registration action from the error response itself.

Runtime-generated errors such as `404`, `415`, and invalid JSON request bodies also return JSON surface bundles when the request negotiates `application/json`. These surfaces use the current request path as `view.route_path` and expose no actions, so agents can parse the failure without inventing a next action.

## Non-Goals For This Milestone

These are intentionally not guaranteed yet:

- Rich object/array editors for human UI.
- Browser route history and back-button behavior.
- Default custom-elements UX polish.
- Server-rendered HTML app pages.
- Public stability guarantees for third-party SDK users.
- Action-proof JSON request wrapping as the default agent path.
- Full streaming/SSE agent consumption.
- SDK-level required-field validation for flat JSON action bodies without action identity. Agents should obey `input_schema.required`; server handlers or action-proof mode remain responsible for rejecting malformed submissions.

## Current Baseline Notes

The SDK validates JSON surface identity fields (`app_id`, `state_id`, `state_version`), action metadata, allowed action references, and block/action references before responding.

The current regression suite proves direct agent flows for `auth-guestbook`: agents can register, authenticate, preserve cookies, submit writes, read state transitions, recover from common auth errors, and avoid HTML entirely.
