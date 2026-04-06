---
title: Agent App Demo
description: See how a real MDAN agent app works, from simple page actions up to multi-step task handoff between agents.
---

# Agent App Demo

This page shows how an agent actually moves through an MDAN agent app, starting from the small examples and ending with the full `agent-tasks` demo.

## Basic Flow

In MDAN, an agent loop is not “call a JSON API, then rebuild the next step yourself”.

It looks like this:

1. Read the full page Markdown.
2. Discover the operations available from the current content.
3. Execute one of those operations.
4. Read the returned Markdown fragment.
5. Continue from the updated context.

That loop works both for simple state updates like `guestbook` and for auth flows like `login`, `register`, and `vault`.

## Example A: Guestbook

Reference: [examples/guestbook/app/server.ts](../examples/guestbook/app/server.ts)

Server behavior:

- `GET /` returns the full page Markdown
- `GET /list` returns the guestbook block fragment
- `POST /post` appends a message and returns the updated guestbook block fragment

The key point is that both reads and writes stay inside the block, so the agent works with a smaller and more stable context.

## Example B: Auth Session

Reference: [examples/auth-session/app/server.ts](../examples/auth-session/app/server.ts)

This example adds two important patterns:

- session mutation during action handling with `signIn` and `signOut`
- explicit page transitions through `auto` follow-up reads resolved by the server host

Typical transitions:

- register success -> sign-in mutation plus `auto GET` follow-up to `/vault`
- login success -> `auto GET` follow-up to `/vault`
- logout -> sign-out mutation plus `auto GET` follow-up to `/login`

That means the agent does not have to guess where to go next. The returned content already carries the next path.

## Example C: Agent Task Handoff

Reference: [demo/agent-tasks/app/server.ts](../demo/agent-tasks/app/server.ts)

Message walkthrough: [demo/agent-tasks/README.md](../demo/agent-tasks/README.md)

This demo pushes the same model into a multi-step delegation flow:

- `GET /tasks/new` returns a task-creation page
- `POST /tasks` creates a task and returns a stable task detail page
- `GET /tasks/:id` returns the long-lived task definition plus the current runtime block
- follow-up writes such as accept, submit, request revision, and complete return the updated runtime block fragment

The important pattern is the split between:

- stable task context in page Markdown
- current-step continuation in the runtime block

That lets one agent create a task, another agent continue from the same page URL, and the reviewer return to the same page to close or re-open the loop.

If you want the most complete runnable example in the repository, start here.

## Agent-Facing Error Strategy

Avoid opaque errors. Return actionable Markdown fragments that include the next legal operation.

In `auth-session`, unauthenticated writes to `vault` return a recoverable fragment that includes a `GET "/login"` operation.

## Verification Checklist

- the agent can identify executable operations, request methods, and input shape from the current page or fragment
- failure states still return Markdown that allows recovery
- session-changing operations also return clear follow-up actions
- write operations return updated block Markdown rather than stale content
- task handoff pages keep long-lived task context stable while block fragments carry the next step

## Related Docs

- [HTTP Content Negotiation](/docs/shared-interaction)
- [Application Structure](/docs/application-structure)
- [Server Integration](/docs/server-integration)
