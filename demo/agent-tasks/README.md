# Agent Tasks Demo

`agent-tasks` is a small MDSN demo for agent-to-agent task handoff.

It proves one narrow idea:

> A task page URL can act as a shared work surface for two agents.

Agent A signs in, creates a task, and hands Agent B one sentence plus the task URL. Agent B signs in, opens that URL, accepts the task, and submits a result. Agent A returns to the same page and either requests revision or completes the task.

This README focuses on the interaction model:

- which messages exist
- how those messages move between server, Agent A, and Agent B
- what the Markdown surfaces look like
- how block fragments carry the next step

## What This Demo Shows

The demo combines three ideas:

1. `auth-session` style session identity
2. a task overview page that acts like an agent work queue
3. a task detail page where the stable task definition lives in the page body and the current-step interaction lives in a runtime block

The important thing is not the task domain itself. The important thing is that the server keeps returning readable and executable Markdown surfaces, not a separate JSON agent API.

## Pages and Routes

### Auth pages

- `GET /login`
- `POST /login`
- `GET /register`
- `POST /register`
- `POST /logout`

### Task pages

- `GET /tasks`
- `GET /tasks/new`
- `POST /tasks`
- `GET /tasks/:id`

### Overview block refreshes

- `GET /tasks/waiting?agent_id=<agent>`
- `GET /tasks/in-progress?agent_id=<agent>`
- `GET /tasks/available?agent_id=<agent>`

### Task runtime actions

- `POST /tasks/:id/accept`
- `POST /tasks/:id/submit`
- `POST /tasks/:id/request-revision`
- `POST /tasks/:id/complete`

## Identity Model

The current signed-in session user is treated as the current agent.

That means:

- task creation uses the session user as `createdBy`
- task creation also uses the session user as `reviewerId`
- task acceptance uses the session user as `assigneeId`
- task submission uses the session user as `submittedBy`
- task review actions use the session user as `reviewedBy`

The demo no longer asks the client to submit `actor_id` on task actions. Identity comes from the session cookie.

## State Model

Tasks move through five states:

- `open`
- `claimed`
- `submitted`
- `needs_revision`
- `completed`

The state machine is intentionally small:

- `open -> claimed`
- `claimed -> submitted`
- `submitted -> needs_revision`
- `needs_revision -> submitted`
- `submitted -> completed`

## Page Model

### 1. Task overview page

`/tasks` is a work queue, not a generic record list.

It is divided into:

- `Waiting for you`
- `In progress`
- `Available`

Each section is mounted through a block anchor and refreshed independently.

Each task summary includes:

- title
- summary
- current status
- next step
- a `GET "/tasks/:id" -> open` operation

### 2. Task detail page

`/tasks/:id` is split into two layers:

#### Stable page body

The page body contains long-lived task definition:

- title
- instruction
- constraints
- acceptance criteria

#### Runtime block

The runtime block contains the current step:

- current status
- one short hint
- any round-local content such as latest submission or latest review note
- current inputs
- current legal actions

This is the block that changes as the task moves from `open`, to `claimed`, to `submitted`, to `needs_revision`, to `completed`.

## Message Types

The app only has a few message shapes. Once these are clear, the whole demo becomes easy to follow.

### 1. Page request

A full-page `GET` returns a full Markdown page plus one or more executable blocks.

Examples:

- `GET /login`
- `GET /tasks`
- `GET /tasks/task-1`

Typical result:

- page body for reading
- embedded block anchors like `<!-- mdsn:block runtime -->`
- `BLOCK ... { ... }` operations that tell the client what it can do next

### 2. Action request

A `POST` executes one workflow step and usually returns only the updated fragment for the active block.

Examples:

- `POST /tasks/task-1/accept`
- `POST /tasks/task-1/submit`
- `POST /tasks/task-1/request-revision`
- `POST /tasks/task-1/complete`

Typical result:

- updated runtime Markdown
- updated `BLOCK runtime { ... }`
- same route, new current step

### 3. Overview refresh request

A section refresh `GET` returns only one overview block fragment.

Examples:

- `GET /tasks/waiting?agent_id=agent-a`
- `GET /tasks/in-progress?agent_id=agent-b`
- `GET /tasks/available?agent_id=agent-b`

Typical result:

- one section of task summaries
- each summary exposes an `Open task` operation

### 4. Recovery response

If the current client cannot continue, the server still returns readable Markdown with a recovery action.

Examples:

- unauthenticated user opens `/tasks`
- non-reviewer tries to complete a task
- assignee tries to submit from the wrong state

Typical result:

- error heading
- short explanation
- `BLOCK recover { ... }`

## Message Content Shapes

This demo keeps message content intentionally small.

### Auth messages

Register and login submit two text fields:

- `nickname`
- `password`

Example register payload:

```md
nickname: "agent-a"
password: "pass-a"
```

### Task creation message

Task creation submits the stable task definition:

- `title`
- `summary`
- `instruction`
- `constraints`
- `acceptance_criteria`

Example create payload:

```md
title: "Implement session_sort"
summary: "Write a Rust sorting function."
instruction: "Write a Rust function named session_sort that returns ascending order."
constraints: "- Handle empty input\n- Preserve duplicates"
acceptance_criteria: "- Return ascending order\n- Match the required function signature"
```

The server fills in:

- `createdBy` from session
- `reviewerId` from session

### Runtime action messages

#### Accept

`accept` has no body. The message is just the operation itself.

#### Submit

`submit` carries one field:

- `result`

Example:

```md
result: "pub fn session_sort(mut values: Vec<i32>) -> Vec<i32> { values.sort(); values }"
```

#### Request revision

`request_revision` carries one field:

- `note`

Example:

```md
note: "Please sort the values before returning."
```

#### Complete

`complete` has no body in this demo.

## End-to-End Message Flow

This is the main loop, written as messages instead of UI clicks.

### Step 1: Agent A registers or signs in

#### Request

`POST /register`

```md
nickname: "agent-a"
password: "pass-a"
```

#### Response

- `200 OK`
- `Set-Cookie: mdsn_session=...`
- full Markdown page for `/tasks`

Typical response body:

````md
# Tasks

This page lists tasks relevant to the current agent.

## Waiting for you

No tasks in waiting for you.

<!-- mdsn:block waiting_for_you -->

## In progress

No tasks in in progress.

<!-- mdsn:block in_progress -->

## Available

No tasks in available.

<!-- mdsn:block available -->

```mdsn
BLOCK waiting_for_you {
  GET "/tasks/waiting?agent_id=agent-a" -> refresh_waiting label:"Refresh waiting"
}

BLOCK in_progress {
  GET "/tasks/in-progress?agent_id=agent-a" -> refresh_in_progress label:"Refresh in progress"
}

BLOCK available {
  GET "/tasks/available?agent_id=agent-a" -> refresh_available label:"Refresh available"
}
```
````

The same basic pattern applies to `POST /login`.

### Step 2: Agent A creates a task

#### Request

`POST /tasks`

```md
title: "Implement session_sort"
summary: "Write a Rust sorting function."
instruction: "Write a Rust function named session_sort that returns ascending order."
constraints: "- Handle empty input\n- Preserve duplicates"
acceptance_criteria: "- Return ascending order\n- Match the required function signature"
```

#### Response

- `200 OK`
- full Markdown page for `/tasks/task-1`

Typical response body:

````md
# Implement session_sort

## Instruction

Write a Rust function named session_sort that returns ascending order.

## Constraints

- Handle empty input
- Preserve duplicates

## Acceptance Criteria

- Return ascending order
- Match the required function signature

Status: open

Review the task and accept it if you will complete it.

<!-- mdsn:block runtime -->

```mdsn
BLOCK runtime {
  POST "/tasks/task-1/accept" () -> accept label:"Accept task"
}
```
````

This is the page URL Agent A can hand to Agent B.

### Step 3: Agent B opens the task page

#### Request

`GET /tasks/task-1`

Headers:

- `Cookie: mdsn_session=<agent-b-session>`

#### Response

- `200 OK`
- full Markdown task page

Agent B reads the stable task definition from the page body, then finds the next legal action in the runtime block:

```mdsn
BLOCK runtime {
  POST "/tasks/task-1/accept" () -> accept label:"Accept task"
}
```

### Step 4: Agent B accepts the task

#### Request

`POST /tasks/task-1/accept`

Headers:

- `Cookie: mdsn_session=<agent-b-session>`

Body:

```md
```

#### Response

- `200 OK`
- runtime block fragment

Typical response body:

````md
Status: claimed

Complete the task and submit a result.

```mdsn
BLOCK runtime {
  INPUT text required -> result
  POST "/tasks/task-1/submit" (result) -> submit label:"Submit result"
}
```
````

The assignee is inferred from the session. No `actor_id` input is needed.

### Step 5: Agent B submits a result

#### Request

`POST /tasks/task-1/submit`

Headers:

- `Cookie: mdsn_session=<agent-b-session>`

```md
result: "pub fn session_sort(mut values: Vec<i32>) -> Vec<i32> { values.sort(); values }"
```

#### Response

- `200 OK`
- updated runtime block fragment

Typical response body:

````md
Status: submitted

Review the submission and either complete the task or request revision.

## Latest submission

pub fn session_sort(mut values: Vec<i32>) -> Vec<i32> { values.sort(); values }

```mdsn
BLOCK runtime {
  INPUT text -> note
  POST "/tasks/task-1/request-revision" (note) -> request_revision label:"Request revision"
  POST "/tasks/task-1/complete" () -> complete label:"Complete task"
}
```
````

At this point the task is waiting for the reviewer.

### Step 6A: Agent A requests revision

#### Request

`POST /tasks/task-1/request-revision`

Headers:

- `Cookie: mdsn_session=<agent-a-session>`

```md
note: "Please sort the values before returning."
```

#### Response

- `200 OK`
- runtime block fragment in `needs_revision`

Typical response body:

````md
Status: needs_revision

Revise the result based on the review note and resubmit.

## Latest review note

Please sort the values before returning.

## Current submission

pub fn session_sort(mut values: Vec<i32>) -> Vec<i32> { values.sort(); values }

```mdsn
BLOCK runtime {
  INPUT text required -> result
  POST "/tasks/task-1/submit" (result) -> submit label:"Resubmit result"
}
```
````

Agent B can now return to the same task URL, read the review note, and resubmit.

### Step 6B: Agent A completes the task

#### Request

`POST /tasks/task-1/complete`

Headers:

- `Cookie: mdsn_session=<agent-a-session>`

Body:

```md
```

#### Response

- `200 OK`
- runtime block fragment in `completed`

Typical response body:

````md
Status: completed

This task is complete.

## Final submission

pub fn session_sort(mut values: Vec<i32>) -> Vec<i32> { values.sort(); values }

```mdsn
BLOCK runtime {
}
```
````

At this point the workflow is closed.

## Recovery and Failure Messages

The demo avoids opaque failures whenever possible.

### Unauthenticated access

If a client tries to open protected task pages without a session, the server returns a recoverable fragment:

````md
## Sign in to open your task queue

Open `/login` to continue.

```mdsn
BLOCK recover {
  GET "/login" -> recover label:"Open Sign In"
}
```
````

### Permission mismatch

If a non-reviewer tries to complete a task, the server returns:

````md
## Only the reviewer can complete this task

Return to the task page and wait for the assigned reviewer to continue.

```mdsn
BLOCK recover {
  GET "/tasks/task-1" -> recover label:"Open task"
}
```
````

### Stale action

If a client tries to run an action that is no longer legal for the current state, the server returns a `409`-style recovery fragment:

````md
## This action is no longer available

Refresh the task page to see the current state before continuing.

```mdsn
BLOCK recover {
  GET "/tasks/task-1" -> recover label:"Open task"
}
```
````

## Sequence Summary

You can also read the whole interaction as one short chain:

1. Agent A authenticates and receives a session cookie.
2. Agent A sends `POST /tasks` and receives a stable task page URL.
3. Agent A gives Agent B one sentence plus that URL.
4. Agent B authenticates and opens the same task URL.
5. Agent B reads the page body for task context and the runtime block for the next action.
6. Agent B sends `POST /tasks/:id/accept`, then `POST /tasks/:id/submit`.
7. Agent A opens the same task URL and decides between `POST /tasks/:id/request-revision` and `POST /tasks/:id/complete`.
8. The server always responds with readable Markdown plus the next legal operation surface.

## Why This Demo Matters

The main point is not that a task system exists. The main point is that:

- identity comes from the same app surface
- tasks live at stable page URLs
- the page body holds stable task context
- the runtime block holds the current interaction step
- agents continue from returned Markdown, not from out-of-band API documentation

That is the core MDSN pattern this demo is meant to show.

## Run It

```bash
cd demo/agent-tasks
npm start
```

The server will print the final URL it bound to. If the default port is occupied, it automatically falls back to an available port.
