---
title: Direct Agent Consumption
description: How an agent can consume MDAN directly over HTTP without a browser-only tool layer.
---

# Direct Agent Consumption

MDAN is meant to be consumed directly by agents.

An agent does not need a headless browser, a separate MCP wrapper, or a custom runtime layer before it can use an MDAN app.

If the agent can:

- read Markdown
- recognize MDAN blocks and operations
- send normal HTTP requests
- keep cookies across requests

it can continue the interaction on its own.

## What The Agent Reads

The agent usually asks for Markdown:

```http
Accept: text/markdown; profile="https://mdan.ai/protocol/v1"
```

The server then returns a Markdown page or fragment that already contains:

- the current interaction context
- the visible blocks
- available inputs
- the next executable operations

That response is not just content. It is the next interaction surface.

## What The Agent Sends

For write operations, the agent sends normal HTTP requests with a Markdown body:

```http
Content-Type: text/markdown
```

The request body is not arbitrary prose. It should use MDAN's direct-write body format:

```md
nickname: "Ada", password: "pass-1234"
```

Another example:

```md
message: "Private note from agent"
```

If the body does not match the expected format, the server can reject it with a recoverable error.

## Minimal Consumption Loop

A simple agent loop usually looks like this:

1. `GET` the current page with `Accept: text/markdown`.
2. Read the returned Markdown and identify visible operations.
3. Choose the next operation.
4. Send the corresponding `GET` or `POST`.
5. Persist cookies if the server sets a session.
6. Continue from the returned page or fragment.

That is enough to support many real app flows.

## Example: Auth Session

In the auth-session example, an agent can:

1. `GET /login`
2. discover `POST "/login"` and `GET "/register"`
3. `POST /register` with:

```md
nickname: "HttpAgent", password: "pass-1234"
```

4. store the returned `mdan_session` cookie
5. `POST /vault` with:

```md
message: "Private note from agent"
```

6. `POST /vault/logout`

The important point is that each response already tells the agent what it can do next.

## Example: Agent Tasks

In the agent-tasks demo, one agent can create a task and another can take it over directly through MDAN pages.

The flow looks like this:

1. Agent A registers and opens `/tasks`
2. Agent A creates a task with `POST /tasks`
3. the returned page includes:

```mdan
POST "/tasks/task-1/accept" () -> accept
```

4. Agent B sends `POST /tasks/task-1/accept`
5. the response includes:

```mdan
POST "/tasks/task-1/submit" (result) -> submit
```

6. Agent B submits a result
7. the reviewer receives:
   `POST "/tasks/task-1/request-revision"` and `POST "/tasks/task-1/complete"`

This is direct handoff over HTTP. No browser automation is required.

## Cookies And Session State

Agents should keep cookies the same way any HTTP client would.

That is enough for flows such as:

- register then continue as the same agent
- sign in and open a protected page
- hand work from one agent identity to another
- reject stale or invalid sessions cleanly

Session handling stays inside ordinary HTTP semantics. MDAN does not need a separate agent session channel.

## What This Proves

Direct consumption matters because it keeps the app surface unified.

- the same app can serve browsers and agents
- the same page definitions can expose both content and actions
- the same server can drive follow-up interaction by returning Markdown
- the agent does not need to imitate a browser just to continue the flow

That is why MDAN can work as an agent-native interaction surface rather than only as a rendering format.

## Related Docs

- [HTTP Content Negotiation](/docs/shared-interaction)
- [Understanding MDAN](/docs/understanding-mdan)
- [Agent App Demo](/docs/agent-app-demo)
- [Protocol v1](https://mdan.ai/protocol/v1)
