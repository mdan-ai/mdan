# SDK Authoring Convergence Design

Date: 2026-04-21

## Goal

Converge the SDK toward an app-authoring experience that feels extremely simple to experienced developers.

The target is:

- no protocol study required to start building
- no duplicated action/page declarations
- minimal public API surface
- protocol details remain internal implementation concerns

This document does not propose protocol changes. It assumes the current MDAN protocol remains unchanged and focuses only on SDK authoring-layer convergence.

## Product Boundary

The SDK should optimize for two separate audiences, but only one of them should shape the public API:

- App developers:
  Want to build and validate business flows quickly.
  Should use a minimal authoring API.
- Protocol-curious developers:
  Want to understand MDAN deeply.
  Should learn from spec docs, architecture docs, examples, and source code.

The public SDK should serve app developers first. Protocol concepts should not leak into the default authoring path.

## Convergence Principles

1. Business intent over protocol intent.
   Public APIs should express pages, actions, inputs, and business results, not artifacts, manifests, operations, or negotiation.

2. One concept, one declaration.
   If the same action data must be written in two places, the SDK abstraction is incomplete.

3. A page should be defined in one local area.
   A developer should be able to inspect one page definition and understand its template, dynamic content, actions, and behavior.

4. Protocol-only objects should not appear in the default authoring path.
   This includes executable content, block operations, frontmatter assembly, host wiring, and response negotiation.

5. The SDK should compile business definitions into protocol output.
   Developers should write page/action definitions.
   The SDK should generate protocol structures internally.

6. The public API must be tiny.
   Ideally the first-contact API is no more than:
   - `createApp`
   - `page`
   - `actions`
   - `fields`

## Problem Statement

Current examples expose three kinds of logic together:

- business intent
- internal canonical model assembly
- protocol projection

This creates the feeling that building a simple app requires maintaining:

- a markdown page
- an action JSON file
- route handlers
- block operations
- artifact assembly metadata

The duplication is not only a documentation problem. It signals that the internal SDK abstractions have not yet fully converged.

## Three-Layer Model

Every important concept in the SDK should be analyzed across three layers:

1. Business Input
   What the developer truly wants to say.

2. Internal Canonical Model
   The SDK's single source of truth.

3. Protocol Output
   The final MDAN-compatible structures returned by the runtime.

### Page

Business input:

- page path
- markdown template file
- dynamic block renderers
- actions attached to the page

Internal canonical model:

- normalized page identity
- markdown source
- block renderers
- attached actions

Protocol output:

- frontmatter
- markdown artifact body
- block content
- executable content
- block anchors / visible blocks

### Action

Business input:

- action id
- method
- optional explicit path
- input shape
- business logic
- next page to render after execution

Internal canonical model:

- normalized action identity
- method/path/verb/label
- input schema
- owning page
- handler

Protocol output:

- executable action entries
- block operations
- route dispatch registration

### Result

Business input:

- refresh current page
- go to another page
- return a status code
- report an error

Internal canonical model:

- normalized result

Protocol output:

- page or action response structures
- transport status and headers
- final projected artifact

## Canonical Internal Models

These internal types should become the stable center of the SDK implementation.

### `NormalizedAction`

```ts
export type ActionMethod = "GET" | "POST";
export type ActionVerb = "read" | "write";

export interface NormalizedActionInputField {
  kind: "text" | "number" | "boolean";
  required: boolean;
  label?: string;
  description?: string;
}

export type NormalizedActionInputShape = Record<string, NormalizedActionInputField>;

export interface NormalizedActionContext<TState = unknown, TInput = Record<string, unknown>> {
  input: TInput;
  state: TState;
  request: {
    method: ActionMethod;
    path: string;
    headers: Record<string, string | undefined>;
  };
}

export interface NormalizedAction {
  id: string;
  pageId: string;
  pagePath: string;
  method: ActionMethod;
  path: string;
  label: string;
  verb: ActionVerb;
  input: NormalizedActionInputShape;
  run: (context: NormalizedActionContext) => Promise<NormalizedResult> | NormalizedResult;
}
```

### `NormalizedBlock`

```ts
export interface NormalizedBlockContext<TState = unknown> {
  state: TState;
}

export interface NormalizedBlock {
  name: string;
  render: (context: NormalizedBlockContext) => Promise<string> | string;
}
```

### `NormalizedPage`

```ts
export interface NormalizedPageLoaderContext<TState = unknown> {
  state: TState;
}

export interface NormalizedPage {
  id: string;
  path: string;
  markdownPath: string;
  markdownSource: string;
  blocks: NormalizedBlock[];
  actions: NormalizedAction[];
  load?: (context: NormalizedPageLoaderContext) => Promise<TState> | TState;
}
```

### `NormalizedResult`

```ts
export interface NormalizedResult {
  pageId?: string;
  pagePath?: string;
  status?: number;
  headers?: Record<string, string>;
  patchState?: Record<string, unknown>;
  error?: {
    message: string;
    code?: string;
  };
}
```

### `AppDefinition`

```ts
export interface AppDefinition<TState = unknown> {
  id: string;
  initialState: TState;
  pagesById: Map<string, NormalizedPage>;
  pagesByPath: Map<string, NormalizedPage>;
  actionsById: Map<string, NormalizedAction>;
  actionsByRouteKey: Map<string, NormalizedAction>;
}
```

## What the Current Starter Reveals

The current starter mixes all three layers in one file.

### Business input that should remain public

- markdown template file
- page path
- message list rendering
- message submission logic

### Internal canonical concerns currently exposed in user code

- action manifest template structure
- state id / state version mutation
- block template filling mechanics
- page assembly orchestration

### Protocol projection currently exposed in user code

- frontmatter
- executable JSON
- block operations
- `createArtifactPage(...)` argument assembly
- explicit `server.page(...)` / `server.post(...)` registration

The main convergence task is to move the second and third categories out of user code.

## Internal Module Responsibilities

The internal implementation should be split into four layers:

1. Authoring Input Layer
2. Normalization Layer
3. Projection Layer
4. Runtime Layer

### Proposed modules

#### `authoring-registry`

Input:

- `createApp(...)`
- `app.page(...)`
- block renderers
- action definitions

Output:

- raw app definitions

Responsibility:

- capture authoring input without protocol details

#### `normalizer`

Input:

- raw app definitions

Output:

- `NormalizedPage`
- `NormalizedAction`
- `NormalizedResult` conventions
- `AppDefinition`

Responsibility:

- establish a single internal source of truth

#### `action-manifest-projector`

Input:

- normalized actions
- page metadata
- state metadata

Output:

- executable action manifest content

Responsibility:

- generate protocol action declarations

#### `block-operations-projector`

Input:

- normalized page
- normalized actions

Output:

- `blocks[].operations`

Responsibility:

- project actions into block operation form

#### `markdown-page-assembler`

Input:

- markdown source
- rendered block content

Output:

- assembled markdown-related page data

Responsibility:

- anchor validation
- template filling or block alignment
- block content preparation

#### `page-frontmatter-projector`

Input:

- normalized page
- state metadata
- action reference metadata

Output:

- frontmatter

Responsibility:

- generate protocol frontmatter fields

#### `artifact-projector`

Input:

- normalized page
- rendered blocks
- projected metadata

Output:

- final `MdanPage`

Responsibility:

- call low-level artifact helpers
- produce protocol-ready page artifacts

#### `app-runtime-router`

Input:

- `AppDefinition`

Output:

- request dispatch behavior

Responsibility:

- page resolution
- action dispatch
- result normalization
- page re-render after action execution

## What Should Be Solved Inside the SDK

These are internal abstraction problems and should be solved before or alongside the authoring API:

1. Action single-source-of-truth
   The same action should not need separate manual declarations for manifest, operations, and route dispatch.

2. Unified result model
   Page and action results should normalize through one internal result shape.

3. Unified page model
   Markdown, block rendering, and attached actions should converge on one internal page definition.

4. Automatic route wiring
   Public authoring should not manually register page and action routes through low-level runtime methods.

5. Artifact projection isolation
   Protocol projection should be a dedicated internal layer, not mixed into user code.

## What Should Be Solved in the Authoring Layer

These are public experience problems and should be handled by a higher-level API:

1. Simple page declaration
2. Local action declaration inside a page definition
3. Minimal block rendering contract
4. Simple action input declaration
5. A tiny action result surface
6. Minimal starter file structure

## Public Authoring API Direction

The initial public API should aim to be:

```ts
export { createApp, fields } from "@mdanai/sdk";
```

### `createApp()`

```ts
export interface CreateAppOptions<TState> {
  id: string;
  state: TState;
}

export interface App<TState> {
  page(path: string, definition: PageDefinition<TState>): App<TState>;
}
```

### `PageDefinition`

```ts
export interface PageDefinition<TState> {
  markdown: string;
  blocks?: Record<string, BlockRenderer<TState>>;
  actions?: Record<string, ActionDefinition<TState>>;
}
```

### `BlockRenderer`

```ts
export interface BlockContext<TState> {
  state: TState;
}

export type BlockRenderer<TState> =
  (context: BlockContext<TState>) => string | Promise<string>;
```

### `ActionDefinition`

```ts
export interface ActionDefinition<TState, TInput = Record<string, unknown>> {
  method: "GET" | "POST";
  path?: string;
  label?: string;
  input?: Record<string, FieldDefinition>;
  run?: (context: ActionContext<TState, TInput>) => ActionResult | Promise<ActionResult>;
}
```

### `FieldDefinition` and `fields`

```ts
export interface FieldDefinition {
  kind: "text" | "number" | "boolean";
  required?: boolean;
  label?: string;
  description?: string;
}

export interface FieldsApi {
  text(options?: Omit<FieldDefinition, "kind">): FieldDefinition;
  number(options?: Omit<FieldDefinition, "kind">): FieldDefinition;
  boolean(options?: Omit<FieldDefinition, "kind">): FieldDefinition;
}
```

### `ActionContext`

```ts
export interface ActionContext<TState, TInput> {
  input: TInput;
  state: TState;
  page: {
    path: string;
  };
  request: {
    method: "GET" | "POST";
    path: string;
    headers: Record<string, string | undefined>;
  };
}
```

### `ActionResult`

```ts
export interface ActionResult {
  page?: string;
  status?: number;
  headers?: Record<string, string>;
  error?: {
    message: string;
    code?: string;
  };
}
```

## Starter Target Shape

The target authoring experience for the starter should look like this:

```ts
import { createApp, fields } from "@mdanai/sdk";

const app = createApp({
  id: "starter",
  state: {
    messages: ["Welcome to MDAN"]
  }
});

app.page("/", {
  markdown: "./app/index.md",

  blocks: {
    main({ state }) {
      const items =
        state.messages.length > 0
          ? state.messages.map((message) => `- ${message}`).join("\n")
          : "- No messages yet";

      return `## Context
This block shows the current starter message feed and accepts a new message submission.

## Result
${items}`;
    }
  },

  actions: {
    refresh_main: {
      method: "GET"
    },

    submit_message: {
      method: "POST",
      input: {
        message: fields.text({ required: true })
      },
      run({ input, state }) {
        const message = input.message.trim();
        if (message) {
          state.messages.unshift(message);
        }

        return { page: "/" };
      }
    }
  }
});

export default app;
```

## Internal Flow for the Future Starter

The intended internal flow should be:

```text
user code
  -> authoring-registry
  -> normalizer
  -> app-definition
  -> runtime router
  -> block render
  -> manifest / operations / frontmatter projection
  -> artifact projector
  -> markdown or html response
```

More concretely:

```text
app.page(...)
  -> normalize page and action definitions
  -> build canonical app model
  -> auto-register page/action routes
  -> render block content
  -> generate executable action manifest
  -> generate block operations
  -> generate frontmatter
  -> createArtifactPage(...)
  -> return protocol response
```

## What Should Disappear From User Code

The following should disappear from the default authoring path:

1. `app/actions/*.json`
2. action manifest types in app code
3. manual state id / state version mutation
4. manual `blocks[].operations`
5. manual `frontmatter`
6. direct `createArtifactPage(...)` assembly
7. direct `server.page(...)` and `server.post(...)` registration
8. manual markdown block replacement plumbing

## What Should Remain in User Code

The following should remain:

1. markdown page templates
2. page paths
3. block rendering logic
4. action input declaration
5. action business logic
6. simple page-oriented action results

## Non-Goals for the First Version

The first convergence version should not attempt to solve:

- protocol extensibility for advanced users
- fragment-level patch authoring
- middleware/plugin systems
- custom host/runtime wiring as public authoring API
- complex validator integrations
- advanced loader/store/provider systems
- new markdown authoring syntax

## Recommended Implementation Order

1. Introduce internal normalized models without changing the public API yet.
2. Make current projections consume the normalized models.
3. Move route wiring behind an internal app runtime.
4. Add the minimal authoring API on top.
5. Rewrite starter against the new API.
6. Validate coverage with docs-starter and auth-guestbook.

## Immediate Review Questions

Before implementation, the following questions should be resolved:

1. Should action `path` remain public and optional, or be fully hidden by default?
2. Should block names be inferred from markdown anchors, or remain explicit in the page definition?
3. Should `GET` actions without `run()` always imply current-page refresh?
4. Should starter-level state remain in-memory in the first version, or should state mutation be abstracted immediately?
5. Should `ActionResult.page` support page ids, page paths, or both?

## Coverage Check

This section evaluates the proposed minimal authoring API against the current example set:

- `examples/starter`
- `examples/docs-starter`
- `examples/auth-guestbook`

The purpose is not to prove completeness. It is to identify:

- what the proposed API already covers well
- what it can cover with small internal extensions
- what would force the first version to expand beyond its intended scope

### Coverage Summary

| Example | Coverage | Notes |
|---|---|---|
| `starter` | High | Strong fit for the proposed first-version API |
| `docs-starter` | High | Same shape as starter with simpler state |
| `auth-guestbook` | Partial | Page/action structure fits well, but authenticated branching and page-scoped status rendering require extra capability |

### `starter`

#### What the proposed API already covers

- single page markdown template
- one dynamic block renderer
- one GET refresh action
- one POST submit action
- in-memory state updates
- rerender current page after action execution

#### What disappears cleanly

- `app/actions/main.json`
- explicit action manifest mutation
- manual `createArtifactPage(...)`
- manual `blocks[].operations`
- explicit `server.page(...)`
- explicit `server.post(...)`

#### Verdict

`starter` is a direct fit for the proposed authoring layer.

This is the best first validation target and should be the first example rewritten.

### `docs-starter`

#### What the proposed API already covers

- single page markdown template
- one dynamic docs block
- one GET refresh action
- no action-local business state mutation required

#### What this example proves

The proposed API works not only for mutable app state but also for content-oriented pages where rendering is mostly a projection of loaded content into a block.

#### Minor requirement surfaced

The current API draft may need a lightweight way to load static or file-backed content during page rendering. This does not require a new public abstraction yet.

The first version can support this through either:

- reading content inside a block renderer
- or a small internal page-level load hook

#### Verdict

`docs-starter` is also a strong fit.

It confirms that the first API does not need to be limited to form-style flows.

### `auth-guestbook`

`auth-guestbook` is the most useful stress test because it exercises:

- multiple pages
- multiple blocks per page
- mixed GET and POST actions
- page-to-page transitions
- status messaging
- conditional page rendering
- authenticated and unauthenticated flows

The current proposed API covers a meaningful portion of it, but not all of it cleanly yet.

#### What the proposed API already covers well

1. Multiple page definitions
   The proposed `app.page(path, ...)` model maps naturally to:
   - `/login`
   - `/register`
   - `/guestbook`

2. Multiple block renderers per page
   The `blocks` shape maps well to:
   - `auth_status`
   - `login`
   - `register_status`
   - `register`
   - `session_status`
   - `messages`
   - `composer`
   - `session_actions`

3. Action declaration locality
   Defining actions inside each page is a strong fit for:
   - `login`
   - `open_register`
   - `register`
   - `open_login`
   - `refresh_messages`
   - `submit_message`
   - `logout`

4. Action result navigation
   `ActionResult.page` is already enough to express:
   - login success -> `/guestbook`
   - logout -> `/login`
   - navigation actions -> `/register` or `/login`
   - failed login/register -> stay on current page

#### What is only partially covered

1. Request-aware page branching
   The current guestbook page route does this:

   - if authenticated, render guestbook
   - if unauthenticated, render login with a status message

   The current API draft assumes `app.page("/guestbook", ...)` maps to one page definition.
   It does not yet define how a page route can conditionally redirect or return another page before block rendering.

   This implies the first version needs one of:

   - a page-level guard or resolver hook
   - a page-level `load()` that can return a redirect/page outcome

2. Page-scoped transient status messages
   Login and register pages render different block content depending on the last action outcome:

   - "Login rejected. Check username and password."
   - "Username already exists."
   - "Signed out."

   The current `ActionResult.error` is not enough on its own because the pages are rendering status as explicit block content, not as a generic error channel.

   This means the first version needs some way for action results to influence the next page render.

   The smallest option is not a general flash/session system.
   The smallest option is a narrow page-result payload, for example:

   - action returns `{ page: "/login", data: { message: "..." } }`
   - block renderers receive `{ state, data }`

3. Navigation-only actions
   Actions like `open_register` and `open_login` behave more like route transitions than business mutations.

   The proposed API can support these with:

   - `method: "GET"`
   - `run() { return { page: "/register" }; }`

   This is workable, but it is worth confirming that the product wants navigation actions to remain explicit authoring actions rather than internal conveniences.

#### What is intentionally out of scope for this design pass

This coverage check does not treat session/auth mechanics as a blocker for first-version authoring design.

The goal here is to evaluate authoring shape, not auth implementation strategy.

Even without solving auth internals, `auth-guestbook` still reveals two real authoring gaps:

- conditional page routing before render
- passing page-specific result data into the next render

#### Verdict

`auth-guestbook` is not fully covered by the smallest API draft, but that is acceptable.

It does not invalidate the proposed direction.
It shows that the first draft is already structurally correct, but needs one additional page-result channel and one page-resolution hook to cover multi-page business flows cleanly.

## Coverage-Based Recommendations

Based on the example set, the first implementation target should be:

1. Fully support `starter`
2. Fully support `docs-starter`
3. Partially support `auth-guestbook` until the page-result and page-resolution gaps are addressed

This is the right sequence because:

- `starter` validates the core page/action/block pipeline
- `docs-starter` validates content-style projection without mutation-heavy flows
- `auth-guestbook` then acts as the first boundary test for whether the API can scale past trivial apps

## Minimal Additions Suggested by Coverage

The coverage check suggests two additions that are small but high leverage.

These should be considered only after the base page/action/block pipeline is working.

### 1. Page result payload

Current gap:

- an action can redirect to a page
- but cannot easily pass page-specific render data for status messaging

Potential extension:

```ts
export interface ActionResult {
  page?: string;
  status?: number;
  headers?: Record<string, string>;
  data?: Record<string, unknown>;
  error?: {
    message: string;
    code?: string;
  };
}
```

And block renderers would receive:

```ts
export interface BlockContext<TState> {
  state: TState;
  data?: Record<string, unknown>;
}
```

This is much smaller than introducing a full flash/session abstraction and directly addresses login/register style feedback.

### 2. Page resolution hook

Current gap:

- a requested route may need to render a different page depending on request/session context

Potential extension:

```ts
export interface PageDefinition<TState> {
  markdown: string;
  resolve?: (context: PageResolveContext<TState>) => PageResolveResult | Promise<PageResolveResult>;
  blocks?: Record<string, BlockRenderer<TState>>;
  actions?: Record<string, ActionDefinition<TState>>;
}
```

Where `resolve()` could allow:

- continue rendering current page
- redirect to another page
- switch to another page definition

This should stay narrow and not become a generalized middleware system.

## What Coverage Says About Scope Discipline

The current example set does not justify expanding the first version into:

- protocol override hooks
- custom block-operation authoring
- public artifact assembly APIs
- public route registration APIs
- generalized middleware or plugin systems

The examples instead support a narrower conclusion:

The first authoring API should stay focused on:

- page declaration
- block rendering
- action declaration
- simple page-oriented results

And only add:

- page result data
- route-level page resolution

if `auth-guestbook` becomes an explicit first-wave target.

## Phase 1 Implementation Plan

This plan is intentionally narrow.

The purpose of Phase 1 is not to finish the full authoring SDK.
The purpose is to prove that the internal abstractions can converge and that `starter` and `docs-starter` can run on top of the new model without protocol changes.

### Phase 1 Goals

1. Introduce internal canonical models without breaking current examples
2. Move protocol projection out of example code and into internal modules
3. Prove the new flow by rewriting `starter`
4. Validate the same flow against `docs-starter`
5. Leave `auth-guestbook` as a boundary test, not a first implementation target

### Phase 1 Non-Goals

- shipping the final public authoring API
- solving auth/session abstractions
- solving generalized page guards or middleware
- exposing low-level escape hatches cleanly
- rewriting every example at once

## Implementation Stages

### Stage 0: Internal Design Lock

Deliverable:

- freeze the internal type shapes for:
  - `NormalizedAction`
  - `NormalizedBlock`
  - `NormalizedPage`
  - `NormalizedResult`
  - `AppDefinition`

Required decisions:

- action path defaulting rule
- action label defaulting rule
- method -> verb mapping
- page id strategy
- page path vs page id semantics in normalized results

Exit criteria:

- the type shapes are stable enough to implement against
- the starter example can be mentally mapped onto the normalized model without ambiguity

### Stage 1: Build the Internal Normalization Layer

Deliverable:

- internal modules that convert raw page/action definitions into canonical normalized models

Suggested modules:

- `src/app-internal/normalize-page.ts`
- `src/app-internal/normalize-action.ts`
- `src/app-internal/build-app-definition.ts`

Responsibilities:

- validate ids and page paths
- attach actions to pages
- compute default labels and verbs
- normalize input field definitions
- create route keys for actions

Exit criteria:

- one normalized action can fully describe:
  - runtime routing
  - executable action projection
  - block operation projection
- one normalized page can fully describe:
  - markdown source
  - block renderers
  - attached actions

### Stage 2: Build the Projection Layer

Deliverable:

- internal projectors that generate protocol structures from normalized models

Suggested modules:

- `src/app-internal/project-action-manifest.ts`
- `src/app-internal/project-block-operations.ts`
- `src/app-internal/project-frontmatter.ts`
- `src/app-internal/project-artifact-page.ts`

Responsibilities:

- generate executable action content
- generate block operations
- generate protocol frontmatter
- assemble final artifact pages through the existing low-level artifact helper

Important constraint:

`createArtifactPage(...)` should become an internal assembly tool in the new flow, not the center of the authoring surface.

Exit criteria:

- no example-specific protocol assembly logic is needed to create:
  - executable action content
  - block operations
  - frontmatter
  - final artifact page

### Stage 3: Build the Internal Runtime Router

Deliverable:

- an internal runtime that serves normalized app definitions without requiring direct `server.page(...)` and `server.post(...)` authoring

Suggested modules:

- `src/app-internal/create-app-runtime.ts`
- `src/app-internal/resolve-page-request.ts`
- `src/app-internal/resolve-action-request.ts`

Responsibilities:

- map GET requests to normalized pages
- map action requests to normalized actions
- parse inputs into the normalized action context
- execute actions
- normalize action results
- rerender target pages
- hand off final page data to the projection layer

Exit criteria:

- a page and its actions can be served from `AppDefinition` alone
- route wiring no longer depends on example-specific manual registration

### Stage 4: Introduce a Minimal Internal Authoring Surface

Deliverable:

- a first internal-facing `createApp()` API that targets the new internal layers

Important note:

At this stage, the API can remain internal or experimental.
The objective is to test ergonomics and implementation shape before committing to the public surface.

Suggested modules:

- `src/app/index.ts`
- `src/app/create-app.ts`
- `src/app/fields.ts`

Responsibilities:

- register pages
- register blocks
- register actions
- return a runnable app definition

Exit criteria:

- `starter` can be rewritten using only:
  - `createApp`
  - `page`
  - `blocks`
  - `actions`
  - `fields`

### Stage 5: Rewrite `starter`

Deliverable:

- a new starter implemented on the authoring API instead of low-level protocol assembly

The rewrite should remove from the example:

- action JSON authoring
- frontmatter assembly
- explicit block operations authoring
- direct `createArtifactPage(...)` use
- direct `server.page(...)` and `server.post(...)` registration

Validation checks:

- markdown response still works
- html projection still works
- submit action still updates the list
- action proof flow still works through the projected protocol output

Exit criteria:

- the new starter is materially shorter
- the new starter expresses only business intent
- protocol fidelity is preserved

### Stage 6: Rewrite `docs-starter`

Deliverable:

- `docs-starter` running on the same internal app pipeline

Why this matters:

This confirms that the new model is not limited to mutation-heavy form flows and also works for content-oriented block rendering.

Validation checks:

- docs page renders correctly
- refresh action projection still works
- no example-specific protocol assembly remains

Exit criteria:

- `docs-starter` uses the same authoring primitives as `starter`
- no extra public API is needed to support it

### Stage 7: Boundary Validation with `auth-guestbook`

Deliverable:

- a documented gap analysis after attempting to map `auth-guestbook` to the new model

This stage is not primarily about finishing the rewrite.
It is about confirming the smallest useful next extensions.

Expected focus:

- page result data
- page resolution hook

Exit criteria:

- a precise decision on whether Phase 2 must include:
  - page result payload
  - page resolution hook
- no pressure to solve full auth/session ergonomics yet

## Suggested Engineering Order

The recommended working order is:

1. internal types
2. normalization layer
3. projection layer
4. runtime router
5. internal `createApp()`
6. rewrite `starter`
7. rewrite `docs-starter`
8. boundary-check `auth-guestbook`

This order is important.

If the public API is built before normalized models and projectors exist, the result will likely be a thin wrapper around the old duplication rather than a real convergence.

## Testing Strategy

Phase 1 should rely on the existing example and runtime tests as much as possible.

### Additions recommended early

1. Unit tests for action normalization
   Validate:
   - label defaults
   - verb defaults
   - path derivation
   - input normalization

2. Unit tests for manifest projection
   Validate:
   - action entries
   - allowed next actions
   - state metadata wiring

3. Unit tests for block operations projection
   Validate:
   - operation names
   - method mapping
   - input schema mapping

4. Unit tests for artifact projection
   Validate:
   - frontmatter projection
   - block content projection
   - final `MdanPage` assembly

5. Example-level tests for rewritten starter/docs-starter
   Validate:
   - markdown GET
   - html GET
   - POST/update behavior
   - no protocol regressions

### Do not require yet

- full auth rewrite tests on the new API
- middleware/plugin extension tests
- complex override/escape hatch tests

## Success Criteria for Phase 1

Phase 1 should be considered successful if all of the following are true:

1. `starter` is rewritten on the new authoring layer
2. `docs-starter` is rewritten on the same primitives
3. no protocol changes were required
4. action duplication is eliminated from example authoring
5. page assembly is internalized
6. route wiring is internalized
7. the resulting authoring code reads like business code, not runtime assembly code

## Failure Signals

Phase 1 should be reconsidered if any of the following happen:

1. the new authoring API still needs manual executable content or block operation authoring
2. the internal runtime cannot serve pages/actions without example-specific glue
3. `starter` becomes shorter but still conceptually exposes protocol projection concerns
4. the normalized models do not actually remove duplicate sources of truth
5. `docs-starter` needs significantly different authoring primitives than `starter`

## Phase 1 Output Artifacts

At the end of Phase 1, the repo should contain:

- internal normalization modules
- internal projection modules
- internal app runtime
- a first internal or experimental `createApp()` surface
- rewritten `starter`
- rewritten `docs-starter`
- a short Phase 1 review note documenting:
  - what worked
  - what still feels awkward
  - whether `auth-guestbook` forces the next API extensions

## Decision Log

This section turns the current open questions into explicit recommendations.

The point is not to predict the final long-term architecture.
The point is to remove ambiguity for Phase 1 implementation.

### Decision 1: Should action `path` remain public?

#### Recommendation

Yes, but optional.

#### Proposed rule

- `path` remains part of `ActionDefinition`
- if omitted, the SDK derives an internal default action path
- examples in the public happy path should usually omit it

#### Why

This preserves flexibility without forcing every author to think about routing details.

It also avoids overcommitting too early to a hidden path derivation model that may later prove too rigid.

#### Phase 1 impact

- normalized actions must always contain a resolved `path`
- authoring input may omit it
- route wiring must operate on the normalized path only

### Decision 2: Should block names be inferred from markdown or remain explicit?

#### Recommendation

Keep block names explicit in authoring for Phase 1, but validate them against markdown anchors.

#### Proposed rule

- authors declare `blocks: { main() { ... } }`
- the SDK parses markdown anchors
- the SDK validates that declared block names exist in markdown
- block inference from markdown alone is deferred

#### Why

Pure inference sounds convenient but tends to produce fragile behavior and weaker editor ergonomics.

Explicit block names keep the authoring model simple and predictable.
Validation against markdown is enough to prevent mismatch.

#### Phase 1 impact

- `markdown-page-assembler` must parse anchors
- normalization or projection must report missing/extra block names clearly

### Decision 3: Should `GET` actions without `run()` imply refresh?

#### Recommendation

Yes.

#### Proposed rule

- if `method === "GET"` and no `run()` is provided, the SDK treats the action as "rerender current page"

#### Why

This makes simple refresh/read actions trivial to author and matches the most common read-action use case in current examples.

It is a high-leverage default that removes boilerplate without adding conceptual weight.

#### Phase 1 impact

- normalization must supply an internal default handler for these actions
- projection still generates a normal action entry and block operation

### Decision 4: Should the first version abstract state deeply?

#### Recommendation

No.

Keep first-version app state simple and in-memory at the authoring level.

#### Proposed rule

- `createApp({ state })` accepts initial in-memory state
- `run({ state })` mutates that state directly for Phase 1 examples
- richer state/provider abstractions are deferred

#### Why

The goal of Phase 1 is convergence of authoring and projection, not state architecture design.

Simple mutable state is enough to validate:

- page rendering flow
- action execution
- rerendering
- protocol projection

#### Phase 1 impact

- examples can move quickly
- state abstraction remains intentionally shallow
- later persistence stories can layer on top once authoring shape is proven

### Decision 5: Should `ActionResult.page` support ids, paths, or both?

#### Recommendation

Support page paths only in Phase 1.

#### Proposed rule

- `ActionResult.page` is a page path string
- page ids remain internal-only for now

#### Why

Paths are already visible, intuitive, and sufficient for the current examples.

Supporting both ids and paths too early adds ambiguity without delivering meaningful first-wave value.

Internal page ids can still exist inside normalized models for indexing and projection.

#### Phase 1 impact

- normalized results should resolve by page path
- public docs and examples remain simple

### Decision 6: Should pages support page-level `load()` in Phase 1?

#### Recommendation

Not in the initial starter rewrite, but yes as an internal-ready extension point if needed by `docs-starter`.

#### Proposed rule

- Phase 1 API can ship without requiring `load()`
- internal models may already reserve a page-level load hook
- `docs-starter` can initially read data inside block renderers if that keeps public API smaller

#### Why

`load()` is useful, but not essential to proving the core page/action/block authoring flow.

It should only become part of the visible public surface if examples clearly need it.

#### Phase 1 impact

- public API can stay smaller
- internal implementation can remain ready to expose `load()` later without major churn

### Decision 7: Should navigation-only actions remain explicit actions?

#### Recommendation

Yes.

#### Proposed rule

- actions like "open register" and "open login" remain normal authored actions
- they return `{ page: "/target" }`

#### Why

This keeps the action model uniform.
The same authoring concept can represent:

- read actions
- write actions
- navigation actions

Introducing a separate navigation primitive this early would complicate the mental model.

#### Phase 1 impact

- no extra API concept is needed
- coverage against `auth-guestbook` stays cleaner

### Decision 8: Should `createArtifactPage(...)` remain public?

#### Recommendation

Not as part of the default authoring story.

#### Proposed rule

- keep it implemented internally
- stop treating it as the public happy-path API
- do not remove it immediately if compatibility still depends on it

#### Why

It is a projection helper, not an authoring abstraction.

Leaving it technically available during migration may be pragmatic, but it should no longer anchor examples or onboarding.

#### Phase 1 impact

- starter/docs-starter rewrites should avoid direct public use
- projection layer should own calls into artifact helpers

### Decision 9: Should low-level `server.page(...)` / `server.post(...)` remain public?

#### Recommendation

Internally yes, publicly not in the default path.

#### Proposed rule

- the low-level runtime methods may continue to exist internally
- the new authoring surface should not require app authors to call them

#### Why

These methods belong to runtime wiring, not business authoring.

The public happy path should target app definition, not route registration.

#### Phase 1 impact

- `app-runtime-router` becomes mandatory
- rewritten examples should not manually register page/action routes

### Decision 10: Should public examples mention protocol internals?

#### Recommendation

No, not in the primary path.

#### Proposed rule

- starter and first-contact docs should use business-language concepts only
- protocol details move to spec docs, architecture docs, and source-oriented material

#### Why

The convergence goal is rapid business development, not protocol education.

Protocol visibility should be intentional and separate, not accidental through authoring APIs.

#### Phase 1 impact

- rewritten examples must be reviewed for vocabulary leakage
- onboarding copy should align with the authoring mental model

## Decisions to Revisit After Phase 1

The following should remain intentionally unresolved until Phase 1 evidence exists:

1. whether page result data should be added publicly
2. whether page-level resolution hooks should be public in Phase 2
3. whether a visible `load()` hook belongs in the first public API
4. whether low-level artifact helpers should remain exported at all
5. whether more advanced validation systems should integrate into `fields`

These questions depend on what breaks or feels awkward when:

- `starter` is rewritten
- `docs-starter` is rewritten
- `auth-guestbook` is mapped against the new model

## Migration Strategy

This section describes how to move from the current SDK shape to the converged authoring model without forcing a risky one-shot rewrite.

The migration strategy should optimize for:

- keeping current examples and tests working while internal abstractions are introduced
- proving the new authoring model on real examples before changing public guidance
- reducing public API exposure gradually rather than abruptly

## Migration Principles

1. Internal-first migration
   Introduce normalized models and projectors before changing public API expectations.

2. Rewrite examples before rewriting the public story
   The new authoring model should prove itself in code before it becomes the new README path.

3. Keep low-level compatibility temporarily
   Low-level helpers may remain available during migration, but they should stop being the recommended authoring path.

4. One public happy path
   Once the new flow is ready, the main docs and starter should point to only one recommended entry path.

5. Do not mix old and new patterns in the same example
   Each example should read coherently. Avoid transitional hybrids that teach both models at once.

## Migration Tracks

The migration work should run in four coordinated tracks:

1. Internal implementation track
2. Example rewrite track
3. Public API/export track
4. Documentation/onboarding track

### Track 1: Internal Implementation

This track happens first.

#### Objective

Build the normalized and projection layers without breaking the existing low-level runtime.

#### Sequence

1. add normalized types
2. add projectors
3. add internal app runtime
4. route new example code through the new runtime

#### Compatibility rule

The old low-level APIs can continue to exist while the new internal stack is built.
They should not be removed before the new example path is stable.

### Track 2: Example Rewrites

This track validates whether the new authoring model is actually simpler.

#### Rewrite order

1. `starter`
2. `docs-starter`
3. `auth-guestbook` mapping or partial rewrite

#### Why this order

- `starter` proves the base page/action/block loop
- `docs-starter` proves non-form content flows
- `auth-guestbook` reveals whether the next surface extensions are really needed

#### Example migration rule

Once an example is rewritten, it should stop demonstrating:

- action JSON authoring
- explicit block operation authoring
- public artifact assembly
- explicit page/action route registration

### Track 3: Public API / Export Surface

This track should move more slowly than the internal and example rewrites.

#### Stage A: Add the new API

Add the new authoring API while keeping existing exports intact.

Likely state:

- low-level server/runtime exports still exist
- new `createApp` and `fields` become available

#### Stage B: Reposition the public story

Once `starter` and `docs-starter` are stable on the new API:

- main docs recommend the new authoring API first
- low-level exports move to advanced/internal-oriented docs

#### Stage C: Reevaluate low-level export visibility

Only after the new authoring API has proven itself should the team decide whether to:

- keep low-level exports public but de-emphasized
- move them to a clearly advanced/legacy path
- or eventually remove some of them from the primary export surface

This decision should be evidence-based, not ideological.

### Track 4: Documentation / Onboarding

This track should lag behind example proof but lead final public rollout.

#### Sequence

1. update starter docs after the starter rewrite lands
2. update main README once both starter and docs-starter are stable
3. split docs into:
   - build an app
   - understand the protocol

#### Documentation rule

The public getting-started path should not teach protocol assembly.

Protocol education should live in:

- spec docs
- architecture docs
- source-oriented guides

not in starter-level onboarding.

## Proposed Migration Phases

### Migration Phase A: Hidden Foundation

Goal:

- build new internal layers
- keep public behavior unchanged

Expected repo state:

- low-level APIs unchanged
- no public docs changes yet
- internal modules exist behind the scenes

Exit criteria:

- normalized models exist
- projection layer exists
- internal runtime can serve app definitions

### Migration Phase B: Proof Through Examples

Goal:

- rewrite `starter`
- rewrite `docs-starter`
- validate that the authoring surface is genuinely simpler

Expected repo state:

- new example path exists
- old example path may still exist temporarily if needed for comparison
- tests cover both correctness and migration safety

Exit criteria:

- rewritten starter is materially simpler
- rewritten docs-starter uses the same primitives
- no protocol regressions are introduced

### Migration Phase C: Public Narrative Switch

Goal:

- make the new authoring API the default story

Expected repo state:

- README points to the new starter path
- create scripts and templates use the new authoring API
- low-level APIs are still available but not foregrounded

Exit criteria:

- first-contact user flow no longer teaches low-level assembly
- examples and starter are aligned with the public message

### Migration Phase D: Low-Level Surface Review

Goal:

- decide what to do with low-level exports in the long term

Decision options:

- keep them public but advanced
- move them behind clearly advanced entry points
- remove some from the main export surface if they are no longer part of the intended product

This review should happen only after:

- the new API has been used on multiple examples
- the team understands what advanced escape hatches are still genuinely needed

## Export Migration Recommendation

Phase 1 should not aggressively remove exports.

Recommended approach:

1. add new top-level exports for the authoring API
2. keep current low-level exports working
3. stop using low-level exports in starter and first-contact docs
4. later decide whether those exports stay public or move to advanced paths

This avoids turning architecture cleanup into a semver disruption before the new path is validated.

## Example Migration Recommendation

### `starter`

Target:

- full rewrite on the new authoring API
- become the canonical public starter

### `docs-starter`

Target:

- full rewrite on the new authoring API
- confirm content-style apps fit the same model

### `auth-guestbook`

Target:

- use as a capability probe
- only rewrite once Phase 1 proves whether page-result data and page-resolution hooks are needed

Do not force `auth-guestbook` into Phase 1 if it would distort the initial public API.

## Template and Scaffolding Migration

`create-mdan` should migrate only after the new authoring API and starter are stable.

Recommended order:

1. rewrite internal example starter
2. validate tests and onboarding
3. switch `create-mdan` templates to the new API

Reason:

Templates are downstream packaging of the recommended path.
They should be updated only once the path is stable enough to endorse.

## Test Migration Strategy

During migration, tests should be split conceptually into two layers:

1. behavioral compatibility tests
   Prove that the protocol behavior remains correct.

2. authoring convergence tests
   Prove that the new public authoring path eliminates duplicate declarations and manual projection work.

Suggested additions:

- snapshot or structural assertions for projected protocol output from authoring definitions
- example-level tests that ensure rewritten examples no longer include legacy authoring artifacts

## Rollback Safety

The migration should preserve a clean rollback path until Phase C is complete.

Practical rule:

- do not delete the old low-level path while the new example flow is still being validated

This allows the team to:

- compare generated outputs
- bisect regressions
- recover quickly if the new authoring shape proves incomplete

## Signals That Migration Is Ready for the Public Switch

The public switch should happen only when all of the following are true:

1. `starter` rewrite is clearly simpler than the old version
2. `docs-starter` uses the same core primitives without extra public complexity
3. projected protocol output remains correct under existing tests
4. low-level concepts no longer appear in the primary onboarding flow
5. the team is confident about the initial answer to:
   - action path defaults
   - block declaration rules
   - result shape

## Signals That Migration Should Pause

Pause the public rollout if any of these happen:

1. rewritten examples still need low-level artifact assembly
2. the new API requires too many special cases between examples
3. low-level concepts keep leaking back into page/action authoring
4. `auth-guestbook` reveals foundational gaps rather than narrow extensions
5. the internal canonical models fail to eliminate duplicate sources of truth

## Expected Outcome of the Migration

If successful, the migration should produce a repo where:

- internal protocol and runtime machinery remain powerful
- public authoring is dramatically smaller and clearer
- examples read like business code
- protocol learning lives in docs and source, not in starter assembly code
- the team can continue evolving internals without exposing that complexity to most developers

## Recommended Next Actions

This section translates the design into immediate practical work.

The goal is to avoid turning the next step into a vague "refactor the SDK" effort.
Each action below should produce a concrete artifact or decision.

## Next 3 Engineering Actions

### 1. Lock the internal normalized models

Deliverable:

- create internal type definitions for:
  - `NormalizedAction`
  - `NormalizedBlock`
  - `NormalizedPage`
  - `NormalizedResult`
  - `AppDefinition`

Why this should be first:

Without these types, the rest of the work risks becoming a wrapper around old duplication instead of a true abstraction reset.

Suggested output:

- a small internal module or set of modules under a new internal directory
- no public API changes yet

Success check:

- the current `starter` can be mechanically described using only these models

### 2. Build the projection path for one page and one action

Deliverable:

- internal projector modules that can take one normalized page and one normalized action and produce:
  - executable action content
  - block operations
  - frontmatter
  - final artifact page

Why this should be second:

This is the fastest way to prove that current duplication can actually be internalized.

Suggested output:

- internal projector modules
- unit tests against the projected structures

Success check:

- a starter-like page can be projected without any example-specific manifest or block-operation authoring

### 3. Rewrite `starter` on the internal app pipeline

Deliverable:

- a rewritten starter using the new authoring surface

Why this should be third:

The starter is the clearest proof of whether the API really converges toward business authoring.

Success check:

- the rewritten starter is shorter
- the rewritten starter no longer contains protocol assembly code
- current starter behavior remains intact under tests

## Next Product/Design Decisions

These should be decided early enough to unblock implementation, but late enough to benefit from prototype evidence.

### 1. Decide whether `path` is visible-but-optional or mostly hidden

Target decision:

- keep `path` in the authoring type for now
- encourage omission in the happy path

Why:

This affects normalization and route wiring immediately.

### 2. Decide the minimum public block contract

Target decision:

- explicit block names in code
- validation against markdown anchors

Why:

This affects both the authoring API and markdown assembly implementation.

### 3. Decide the smallest acceptable action result shape

Target decision:

- keep the first result model narrow:
  - `page`
  - `status`
  - `headers`
  - `error`

Why:

This prevents Phase 1 from growing into a generalized app result system too early.

## Recommended Prototype Sequence

The implementation work should move in this order:

1. create normalized types
2. implement one-page/one-action projection
3. create a tiny internal `createApp()` prototype
4. rewrite `starter`
5. validate `docs-starter`
6. run a focused gap review on `auth-guestbook`

This order matters because it keeps the team validating the smallest complete loop first.

## Recommended Review Ritual

After each of the milestones below, pause and review before expanding scope:

### Milestone A

- normalized models compile
- one action can project to manifest + operations

Review question:

- did we actually remove a source of truth, or just rename it?

### Milestone B

- starter runs on the new internal app flow

Review question:

- does the new starter read like business code to someone who does not know MDAN internals?

### Milestone C

- docs-starter also works on the same flow

Review question:

- is the API truly general for simple apps, or is it secretly tuned only for form flows?

### Milestone D

- `auth-guestbook` gap review is complete

Review question:

- are the next required extensions narrow and local, or are we still missing a deeper abstraction?

## Recommended Boundaries for the First Two Weeks

To prevent scope creep, the first two weeks of work should explicitly avoid:

- auth/session redesign
- middleware/plugin systems
- advanced public escape hatches
- custom transport/public runtime customization
- protocol changes
- rewriting every example

The only acceptable scope expansion during this window should be:

- page result data if `auth-guestbook` proves it unavoidable
- page resolution hook if route-level branching proves unavoidable

## Deliverables to Expect Soon

If work starts immediately, the next concrete outputs should be:

1. internal normalized model modules
2. internal projection modules for action/page output
3. a minimal internal `createApp()` proof of concept
4. a rewritten `starter`
5. a short follow-up design note documenting what changed after the prototype

## Final Recommendation

The team should now stop expanding the design surface and start validating it through one narrow implementation slice.

The best next slice is:

- normalized models
- projection layer
- starter rewrite

That slice is small enough to complete, large enough to test the core thesis, and focused enough to reveal whether the current public complexity is really an abstraction problem or just an authoring-surface problem.

## Validation Status

This section records what has already been validated in code by the current internal prototype.

The goal is to distinguish:

- design claims that are still hypothetical
- design claims that have already been exercised by tests and example rewrites

### Current Validation Level

Status:

- internal prototype exists
- internal tests exist
- `starter` is running on the internal app pipeline
- `docs-starter` is running on the internal app pipeline
- auth-guestbook-style flow is covered by internal tests

This means the convergence proposal is no longer only a design direction.
It is now partially validated by executable code.

## What Is Already Validated

### 1. Normalized action model

Validated by:

- `test/app-internal/normalize-action.test.ts`

What is proven:

- action id, page ownership, label defaulting, path defaulting, and verb mapping can converge into one internal action definition

Implication:

- action duplication is not structurally required by the protocol
- it can be internalized behind one canonical model

### 2. Normalized page model

Validated by:

- `test/app-internal/normalize-page.test.ts`

What is proven:

- blocks and page-owned actions can be attached to a single normalized page object

Implication:

- page behavior can be localized in one internal definition instead of being scattered across markdown, actions JSON, and route registration code

### 3. Action manifest projection

Validated by:

- `test/app-internal/project-action-manifest.test.ts`

What is proven:

- normalized actions can be projected into executable action manifest content without hand-authored action JSON files

Implication:

- `app/actions/*.json` is not a required long-term authoring artifact

### 4. Block operations projection

Validated by:

- `test/app-internal/project-block-operations.test.ts`

What is proven:

- the same normalized actions can be projected into block operations automatically

Implication:

- manual `blocks[].operations` authoring is not fundamentally necessary

### 5. Artifact page projection

Validated by:

- `test/app-internal/project-artifact-page.test.ts`

What is proven:

- normalized page + rendered block content + projected metadata is sufficient to assemble a final artifact page

Implication:

- `createArtifactPage(...)` can sit behind an internal projection layer instead of being part of the main authoring path

### 6. Internal app runtime

Validated by:

- `test/app-internal/create-app-runtime.test.ts`

What is proven:

- a minimal internal `createApp()` can define a page, serve it through the existing server runtime, and execute a POST action with action proof intact

Implication:

- the authoring-layer idea is compatible with the existing runtime contract
- protocol preservation does not require keeping low-level authoring public

### 7. Content-style page flow

Validated by:

- `test/app-internal/create-app-docs-runtime.test.ts`
- rewritten `examples/docs-starter/app.ts`
- `test/server/docs-starter-artifact-example.test.ts`

What is proven:

- the internal app pipeline is not limited to form-style flows
- content-block pages with GET refresh actions also fit the same model

Implication:

- the new authoring direction is broad enough for both starter and docs examples

### 8. Page result data

Validated by:

- `test/app-internal/create-app-page-result-data.test.ts`

What is proven:

- action results can pass page-scoped data into the next render

Implication:

- login/register style status messaging does not require a full session or flash abstraction just to validate the authoring model

### 9. Page resolution hook

Validated by:

- `test/app-internal/create-app-page-resolution.test.ts`

What is proven:

- a requested page can resolve to another page before render and carry result data with it

Implication:

- the guestbook-to-login guard style flow can be expressed with a narrow page-level hook

### 10. Multi-page auth guestbook-style flow

Validated by:

- `test/app-internal/create-app-auth-guestbook-flow.test.ts`

What is proven:

- the internal `createApp()` prototype can already express:
  - multi-page navigation
  - login
  - registration-style validation patterns
  - message posting
  - logout
  - page result data
  - page resolution
  - action proof usage across the full flow

Implication:

- the current internal authoring direction is strong enough to represent most of the `auth-guestbook` authoring model

## What Has Been Rewritten in Real Examples

### `starter`

Current state:

- migrated to the internal app pipeline
- existing example behavior test still passes

What this proves:

- the internal path can replace hand-authored protocol assembly in a real example, not just synthetic tests

### `docs-starter`

Current state:

- migrated to the internal app pipeline
- existing example behavior test still passes

What this proves:

- the same internal model works for a second example category without changing the underlying protocol

## What Is Still Not Yet Validated

The following remain design-level or partial concerns:

1. public export shape
   The internal prototype exists, but the public package surface is not yet finalized.

2. `fields` public authoring API
   Internal field shapes exist, but the final public helper API is not yet implemented.

3. public naming and package layout
   Internal structure is proving out first; public naming remains a separate product decision.

4. migration of the full `auth-guestbook` example file
   The flow is validated in tests, but the example itself is not yet rewritten.

5. interaction with session/auth implementation strategy
   Authoring shape is validated independently, but public auth ergonomics are intentionally unresolved.

## Updated Interpretation of the Coverage Check

The earlier coverage check identified two likely extensions needed for `auth-guestbook`:

- page result data
- page resolution hook

These are now no longer hypothetical.
They are implemented in narrow form inside the internal prototype and validated by tests.

This materially strengthens the proposal:

- the first authoring surface did not collapse when faced with multi-page flows
- the missing capabilities turned out to be narrow and local, not signs of a broken abstraction

## Practical Conclusion

At this point, the strongest remaining uncertainty is no longer:

- "can this authoring model work?"

The stronger remaining questions are now:

- how should the public API be shaped?
- how aggressively should low-level exports be de-emphasized?
- when should the public documentation switch to the new path?

That is a better kind of uncertainty.
It means the core technical thesis has already crossed from speculation into evidence.

## SDK Core Refactor Breakdown

This section is intentionally implementation-oriented.

It reframes the next phase of work away from "add an app API" and toward:

- fixing the SDK core structure
- removing duplicate representations
- cleaning up misplaced responsibilities
- preparing the core so that any future app API is thin rather than compensatory

The plan is divided into five refactor points.
They should be tackled in order.

## Refactor Point 1: Unify the Internal Core Model

### Problem

The SDK currently allows the same business meaning to exist in multiple internal shapes:

- page behavior appears partly in page handlers, partly in artifact assembly, and partly in example-local structures
- action behavior appears partly in action manifests, partly in block operations, and partly in route wiring
- result behavior is split across page results, action results, readable surfaces, and example-local conventions

This leads to:

- duplicate sources of truth
- projection logic leaking into examples
- runtime logic depending on historical representation details

### Current files most affected

- `src/server/runtime.ts`
- `src/server/result-normalization.ts`
- `src/server/artifact.ts`
- `src/server/router.ts`
- example files that currently act as structure assembly code

### What should be deleted or phased out

- example-local manifest types
- example-local route assembly conventions that encode internal structure
- ad hoc internal shape differences that only exist because examples built protocol output manually

### What should be introduced or consolidated

- one canonical internal page model
- one canonical internal action model
- one canonical internal result model
- one app-level registry or equivalent route-addressable model

### What "done" looks like

- runtime, projection, and future authoring layers all depend on the same page/action/result language
- examples no longer need to invent their own intermediate structures

### Verification

- normalized model tests remain green
- current examples can be described without introducing extra local shape definitions

## Refactor Point 2: Pull Projection Back Into the Core

### Problem

Manifest generation, block operation generation, frontmatter generation, and artifact page assembly are protocol projection concerns, but historically they were not fully owned by the SDK core.

That caused examples to take on responsibilities they should never have had:

- hand-building executable content
- hand-building block operations
- hand-building frontmatter
- hand-assembling artifact pages

### Current files most affected

- `src/server/artifact.ts`
- `src/server/contracts.ts`
- `src/server/surface-projection.ts`
- example files currently calling `createArtifactPage(...)`

### What should be deleted or phased out

- example-side manifest assembly
- example-side block operation assembly
- example-side frontmatter assembly
- examples treating artifact helpers as the primary authoring API

### What should be introduced or consolidated

- core-owned projectors for:
  - action manifest
  - block operations
  - frontmatter
  - artifact page assembly

### What "done" looks like

- protocol output is generated from the core model in one place
- examples provide business definitions, not protocol projection code

### Verification

- projection tests remain green
- starter/docs-style examples no longer require manual manifest or operation assembly

## Refactor Point 3: Refactor Runtime to Consume the Core Model Directly

### Problem

The current runtime still fundamentally revolves around the old route-registration and handler-result shape.

The recent prototype proved that a higher-level authoring flow works, but the prototype is still a parallel path.

That means the core runtime has not yet fully absorbed:

- page resolution
- action execution
- rerender orchestration
- page result data flow
- page resolution hooks

### Current files most affected

- `src/server/runtime.ts`
- `src/server/router.ts`
- `src/server/result-normalization.ts`
- `src/server/request-inputs.ts`
- `src/server/action-proofing.ts`

### What should be deleted or phased out

- example-specific route glue
- parallel runtime behavior living outside the core server path
- assumptions that page/action behavior must enter through low-level manual registration only

### What should be introduced or consolidated

- a core route flow that understands page/action definitions directly
- core-owned rerender behavior after action execution
- core-owned page resolution before render
- core-owned propagation of page result data into the next render

### What "done" looks like

- the runtime itself can execute the converged page/action model
- higher-level authoring does not require a parallel runtime implementation

### Verification

- starter behavior still passes under the core runtime
- docs-style pages still pass under the same runtime
- auth-guestbook-style tests still pass with page result data and page resolution

## Refactor Point 4: Clean Up Misplaced Low-Level Authoring Surfaces

### Problem

Some low-level helpers are currently positioned ambiguously:

- they are useful as internal building blocks
- but they also appear close to the public authoring path

This creates confusion about what the SDK is actually asking developers to do.

### Current files most affected

- `src/index.ts`
- `src/server/index.ts`
- README and example entry points
- starter templates and scaffolding

### What should be deleted or phased out

- low-level helpers appearing in starter-level authoring
- documentation that presents protocol assembly helpers as the normal path
- example code that teaches low-level assembly as the first way to build an app

### What should be retained but repositioned

- low-level artifact helpers
- low-level server runtime entry points
- protocol-level utilities

These may still exist, but their role should be:

- internal building blocks
- advanced or protocol-oriented usage
- not the default app-authoring path

### What "done" looks like

- low-level helpers have a clear advanced/internal role
- main examples no longer depend on them directly
- first-contact docs do not teach them as the default path

### Verification

- starter/docs examples stop importing low-level assembly helpers directly
- README path no longer depends on protocol assembly code

## Refactor Point 5: Only Then Shape the App API

### Problem

If an app API is introduced before the core structure is repaired, it becomes a compensation layer over duplication rather than a real authoring abstraction.

### Current risk

- a beautiful outer API can still depend on a messy parallel runtime
- internal duplication can stay alive under a thinner façade
- long-term maintenance cost increases

### What should be avoided

- adding more app-layer capability before the core responsibilities are settled
- hardening temporary prototype shapes into public commitments too early

### What should happen after Points 1-4

- design a thin public authoring façade
- expose only the business-shaped surface
- keep protocol complexity behind the core runtime and projection layers

### What "done" looks like

- a future `createApp` is thin
- it does not own a separate runtime subsystem
- it delegates to the cleaned-up SDK core

### Verification

- public app API can be implemented with minimal glue
- removing the prototype-only scaffolding does not reduce capability

## Suggested Work Order

The implementation order should be:

1. unify internal model
2. pull projection into core
3. refactor runtime to consume the core model
4. clean up misplaced low-level authoring surfaces
5. shape and expose the app API

This order matters because:

- Points 1-3 change the actual center of gravity of the SDK
- Point 4 removes misleading structure
- Point 5 then becomes product shaping, not architectural patching

## Concrete Deletion / Cleanup Targets

The following categories should be treated as cleanup candidates during the refactor:

### Example-local protocol structures

Examples:

- local `ActionManifest` types
- cloned manifest templates
- local frontmatter assembly code

Target state:

- deleted from examples
- replaced by core-owned projection

### Example-local runtime glue

Examples:

- direct `server.page(...)` / `server.post(...)` flows in examples whose real job is just to wire page and action definitions

Target state:

- deleted from examples
- replaced by core runtime consumption of the converged model

### Public-path imports of low-level helpers

Examples:

- examples or templates treating artifact helpers as the normal way to build an app

Target state:

- deleted from starter-level paths
- retained only in advanced/internal contexts where still useful

## Concrete Refactor Deliverables

To keep this tractable, each refactor point should produce a visible deliverable.

### Deliverable A

- core page/action/result model becomes the dominant internal language

### Deliverable B

- projection is owned by the core and no longer taught through examples

### Deliverable C

- runtime executes the converged model directly

### Deliverable D

- examples stop carrying protocol assembly and runtime glue

### Deliverable E

- only after A-D, a public app authoring surface is finalized

## Completion Criteria for the Core Cleanup Phase

The SDK core cleanup phase should be considered complete when all of the following are true:

1. current example categories no longer need manual protocol projection
2. runtime behavior is driven by the converged internal model
3. projection is a core responsibility, not an example responsibility
4. low-level helpers are clearly advanced/internal, not default authoring tools
5. the future public app API can be implemented as a thin façade rather than a parallel subsystem

## Final Note on Scope

This breakdown intentionally deprioritizes writing more app-facing code right now.

The priority is:

- remove bad structure
- collapse duplicate representations
- move responsibilities into the correct core layer

Only after that should the SDK formally grow a public app-authoring API.

## SDK Convergence Tracking Table

This table is the working tracker for the SDK convergence effort. It is intended to keep the implementation sequence honest: core cleanup first, old-path cleanup second, public app API last.

| Task | Goal | Current status | Next step |
| --- | --- | --- | --- |
| Core result model convergence | Move page/action result interpretation into normalization instead of leaving it scattered across runtime branches | In progress, major progress made | Continue pulling remaining page/action special cases out of `runtime.ts` and into normalization/resolution helpers |
| Runtime execution skeleton convergence | Share more of the handler execution, readable-surface validation, and response-finalization skeleton between page and action paths | In progress, major progress made | Continue reducing duplicated page html/markdown and action respond/finalize branches |
| Readable surface validation convergence | Keep one shared readable-surface contract validation path for runtime consumption | First stage completed | Check for remaining side paths that still validate readable surfaces differently |
| Auto-dependencies result model convergence | Remove page-only parallel result shapes and reuse standard action result semantics | First stage completed | Keep reducing page/action-specific branching inside `auto-dependencies.ts` |
| Page handler result classification convergence | Ensure runtime stops guessing page result shapes directly | First stage completed | Continue thinning page response assembly after normalization |
| Action handler result classification convergence | Ensure runtime stops guessing action result shapes directly | First stage completed | Continue thinning action response assembly after normalization |
| Page session mutation correctness | Ensure page handler session mutations commit on both markdown and html reads | Fixed | Add a broader page/session regression pass later if more page-path refactors land |
| Readable-surface identity normalization | Move `app_id` / `state_id` / `state_version` defaulting into the server core instead of examples/templates | First stage completed | Keep checking for paths that still bypass readable-surface normalization |
| Thin wrapper / middle-layer cleanup | Delete server-side wrappers that only forward or rename behavior without adding abstraction value | First stage completed | Audit the remaining low-level helpers for other pass-through layers with no lasting value |
| Legacy internal shape cleanup | Delete duplicate internal shapes and helpers that only exist to support older paths | In progress, meaningful progress made | Audit the remaining `server` helpers for repeated representations of the same result/response meaning |
| Example-side old assembly cleanup | Stop examples from carrying protocol assembly responsibilities that belong in the SDK | In progress, meaningful progress made | Continue removing protocol metadata and contract boilerplate from examples that still carry it |
| Low-level API positioning cleanup | Clarify which APIs are internal helpers, advanced escape hatches, or main-path APIs | In progress, first stage completed in docs/templates | Revisit public docs and package reference once core cleanup settles further |
| Public app API | Build a thin app-facing façade on top of a cleaner core | Intentionally deferred | Start only after core convergence and old-path cleanup are materially further along |

### Status Summary

Completed first stage:

- readable surface validation convergence
- auto-dependencies parallel result model convergence
- page handler result classification convergence
- action handler result classification convergence
- page session mutation bug fix
- initial thin-wrapper deletion
- readable-surface identity normalization (`appId` plus automatic `app_id/state_id/state_version` fill-in)
- scaffold/example removal of starter-level action JSON protocol files
- starter/docs/auth examples moved off manual frontmatter/body projection
- primary README and guide examples moved off manual protocol identity fields

In progress:

- core result model convergence
- runtime execution skeleton convergence
- legacy internal shape cleanup
- example-side old assembly cleanup
- low-level API positioning cleanup

Not formally started:

- public app API
- final docs/scaffold/public narrative migration

### Recommended Order

1. Continue converging the `server` core.
2. Keep deleting remaining legacy internal shapes and protocol boilerplate from examples/templates.
3. Finish lowering low-level artifact helpers out of the default public narrative.
4. Only then start the public app-facing API.

### Rough Progress Estimate

- Core convergence: around 70%
- Old-structure cleanup: around 55%
- Public app API: around 0% to 10%
- Overall SDK convergence effort: around 60%
