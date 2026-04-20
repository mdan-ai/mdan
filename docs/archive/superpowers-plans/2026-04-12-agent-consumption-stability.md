# Agent Consumption Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove and harden the agent-direct consumption path before expanding SDK openness or broader human-facing web polish.

**Architecture:** Treat the JSON surface envelope and Markdown protocol response as the primary contract for agents. Use auth/session examples as realistic agent-flow fixtures, but keep browser/default UI concerns out of scope unless they break the agent contract.

**Tech Stack:** TypeScript, Bun, Vitest, MDAN server runtime, JSON surface envelopes, Markdown protocol responses

---

## Scope

This plan focuses on whether an agent can directly consume an MDAN app over HTTP.

In scope:

- JSON surface envelope shape
- Markdown protocol response shape
- `actions.actions`
- `allowed_next_actions`
- `input_schema`
- `view.route_path`
- `state_id` / `state_version`
- page/action result progression
- session/auth flows as an agent sees them
- agent-readable errors

Out of scope for this phase:

- default UI visual polish
- browser history/back behavior
- no-JS form compatibility
- custom elements UX
- complex object/array editors
- public launch/open readiness

---

## File Map

**Core runtime and bridge**
- Modify if needed: `src/server/runtime.ts`
- Modify if needed: `src/bridge/json-snapshot-adapter.ts`
- Modify if needed: `src/core/contracts.ts`
- Modify if needed: `src/core/json-body.ts`
- Modify if needed: `src/server/types.ts`

**Agent-flow tests**
- Create: `test/server/agent-consumption-auth-guestbook.test.ts`
- Create: `test/server/agent-consumption-auth-session.test.ts`
- Create: `test/server/agent-consumption-contract.test.ts`

**Existing fixtures to reuse**
- Reference: `examples/auth-guestbook/app.ts`
- Reference: `examples/auth-guestbook/app/actions/login.json`
- Reference: `examples/auth-guestbook/app/actions/register.json`
- Reference: `examples/auth-guestbook/app/actions/guestbook.json`
- Reference: `examples/auth-session/app.ts`
- Reference: `examples/auth-session/app/actions/login.json`
- Reference: `examples/auth-session/app/actions/register.json`
- Reference: `examples/auth-session/app/actions/vault.json`
- Reference: `test/server/auth-guestbook-artifact-example.test.ts`
- Reference: `test/server/auth-session-json-example.test.ts`
- Reference: `test/server/runtime-json-bridge.test.ts`
- Reference: `test/server/runtime-json-session-isolation.test.ts`

**Docs**
- Modify: `docs/2026-04-11-sdk-feature-backlog.md`
- Modify or create: `docs/2026-04-12-agent-consumption-contract.md`

---

## Agent Consumption Contract

For this phase, an agent-consumable response is stable when an agent can answer these questions from the response alone:

1. What app/state am I looking at?
2. What route should I consider current?
3. What human/agent-readable content is relevant?
4. Which actions are currently allowed?
5. What input fields are required for each allowed action?
6. What target/method should I call for each allowed action?
7. Did the action succeed, fail, require login, or produce a validation error?
8. What is the next page/state after the action?

Minimum expected fields:

```ts
type AgentSurface = {
  content: string;
  actions: {
    app_id: string;
    state_id: string;
    state_version: number;
    response_mode?: "page";
    blocks: string[];
    actions: Array<{
      id: string;
      label?: string;
      verb?: string;
      target: string;
      transport?: { method?: "GET" | "POST" };
      input_schema?: Record<string, unknown>;
    }>;
    allowed_next_actions?: string[];
  };
  view?: {
    route_path?: string;
    regions?: Record<string, string>;
  };
};
```

---

### Task 1: Freeze The Agent Contract Baseline

**Files:**
- Create: `docs/2026-04-12-agent-consumption-contract.md`
- Reference: `src/bridge/json-snapshot-adapter.ts`
- Reference: `src/core/contracts.ts`
- Reference: `examples/auth-guestbook/app.ts`
- Reference: `examples/auth-session/app.ts`

- [x] **Step 1: Write the contract doc**

Create `docs/2026-04-12-agent-consumption-contract.md` with:
- required fields
- allowed optional fields
- how agents should select an action
- how agents should construct payloads from `input_schema`
- how agents should interpret `view.route_path`
- how agents should interpret errors

- [x] **Step 2: Capture existing contract validation**

Run:

```bash
rg -n 'assertActionsContractEnvelope|allowed_next_actions|input_schema|route_path|state_id|state_version' src test examples
```

Expected: current validation and example envelope construction sites are visible.

- [x] **Step 3: Record what is intentionally not guaranteed yet**

Document these as non-goals:
- object/array rich input UX
- browser route history
- default UI behavior
- public stability guarantees

---

### Task 2: Add Agent Surface Test Helpers

**Files:**
- Create: `test/server/agent-consumption-contract.test.ts`
- Create helper inside the same file unless duplication later justifies extraction

- [x] **Step 1: Write helper assertions for agent-visible surfaces**

Create local helper functions:

```ts
function expectAgentSurface(response: MdanResponse) {
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(500);
  expect(typeof response.body).toBe("string");
}

function parseSurfaceBody(response: MdanResponse): string {
  return String(response.body);
}

function expectAction(surface: AgentSurface, id: string) {
  const action = surface.actions.actions.find((candidate) => candidate.id === id);
  expect(action).toBeTruthy();
  return action!;
}
```

If tests consume JSON envelopes directly from handlers, keep helpers strongly typed. If tests consume serialized Markdown, assert on frontmatter/content/action references instead.

- [x] **Step 2: Add baseline contract tests for minimal fixture envelopes**

Cover:
- missing `state_id` fails contract validation
- `allowed_next_actions` filters blocked actions
- `input_schema.required` is preserved
- `view.route_path` is preserved

- [x] **Step 3: Run contract tests and verify current behavior**

Run:

```bash
bunx vitest run test/server/agent-consumption-contract.test.ts test/server/runtime-json-bridge.test.ts
```

Expected: new tests either pass if current behavior is already correct or fail with specific contract gaps.

---

### Task 3: Add Auth Guestbook Agent Flow Test

**Files:**
- Create: `test/server/agent-consumption-auth-guestbook.test.ts`
- Reference: `examples/auth-guestbook/app.ts`

- [x] **Step 1: Write an end-to-end agent flow test**

Flow:

1. `GET /login` as agent
2. Confirm `login` and `open_register` are allowed actions
3. Confirm `login` requires `username` and `password`
4. `POST /auth/register`
5. Confirm response advances to `/guestbook`
6. Confirm session cookie is issued
7. `GET /guestbook` with cookie
8. Confirm `submit_message`, `refresh_messages`, and `logout` are allowed
9. `POST /guestbook/post`
10. Confirm message is visible in the returned agent-readable body
11. `POST /guestbook/logout`
12. Confirm old session can no longer submit

- [x] **Step 2: Assert agent-readable action metadata, not HTML**

Required assertions:

```ts
expect(registerAction.target).toBe("/auth/register");
expect(registerAction.transport?.method).toBe("POST");
expect(registerAction.input_schema?.required).toEqual(["username", "password"]);
expect(surface.actions.allowed_next_actions).toContain("submit_message");
expect(surface.view?.route_path).toBe("/guestbook");
```

- [x] **Step 3: Run the guestbook agent flow test**

Run:

```bash
bunx vitest run test/server/agent-consumption-auth-guestbook.test.ts
```

Expected: failure should identify missing or unstable agent-visible metadata, not UI details.

- [x] **Step 4: Fix only agent-contract issues**

If this test fails:
- prefer fixing envelope/action/schema/runtime semantics
- do not fix by changing browser-only HTML behavior
- do not collapse action endpoints into page routes

- [x] **Step 5: Re-run**

Run the same test plus:

```bash
bunx vitest run test/server/auth-guestbook-artifact-example.test.ts test/server/runtime-json-session-isolation.test.ts
```

Expected: all PASS.

---

### Task 4: Add Auth Session Agent Flow Test

**Files:**
- Create: `test/server/agent-consumption-auth-session.test.ts`
- Reference: `examples/auth-session/app.ts`

- [x] **Step 1: Write an end-to-end vault flow test**

Flow:

1. `GET /login`
2. Confirm login/register actions
3. `POST /auth/register`
4. Confirm route `/vault`
5. `POST /vault` to save note
6. Confirm note is visible
7. `POST /vault/logout`
8. `POST /auth/login`
9. Confirm saved note returns
10. Access `/vault` without cookie and confirm agent-readable login-required response

- [x] **Step 2: Assert stable state/version behavior**

At minimum:

```ts
expect(surface.actions.state_id).toContain("auth-session:");
expect(typeof surface.actions.state_version).toBe("number");
expect(surface.view?.route_path).toBe("/vault");
```

Add a targeted assertion that saving a note advances state identity/version if that is intended. If not intended, document that state version is only a page-envelope freshness marker for now.

- [x] **Step 3: Run the auth-session agent flow test**

Run:

```bash
bunx vitest run test/server/agent-consumption-auth-session.test.ts
```

Expected: failure should point to agent surface instability or unclear state semantics.

- [x] **Step 4: Fix only agent-contract issues**

Same guardrails as Task 3.

- [x] **Step 5: Re-run**

Run:

```bash
bunx vitest run test/server/agent-consumption-auth-session.test.ts test/server/auth-session-json-example.test.ts
```

Expected: PASS.

---

### Task 5: Lock Agent-Readable Error Surfaces

**Files:**
- Modify: `test/server/agent-consumption-auth-guestbook.test.ts`
- Modify: `test/server/agent-consumption-auth-session.test.ts`
- Modify if needed: `src/server/runtime.ts`
- Modify if needed: `examples/auth-guestbook/app.ts`
- Modify if needed: `examples/auth-session/app.ts`

- [x] **Step 1: Add error-path tests**

Cover:
- invalid login credentials
- duplicate registration
- missing required input
- expired/old session cookie
- unauthenticated write action

- [x] **Step 2: Assert errors are agent-readable**

Minimum assertions:

```ts
expect(response.status).toBe(401);
expect(String(response.body)).toContain("Invalid credentials");
expect(String(response.body)).toContain("# Sign In");
expect(surface.view?.route_path).toBe("/login");
```

If current serialized format does not allow structured `surface` parsing for errors, assert on stable Markdown/content plus route semantics and document the limitation.

- [x] **Step 3: Run error-path tests**

Run:

```bash
bunx vitest run test/server/agent-consumption-auth-guestbook.test.ts test/server/agent-consumption-auth-session.test.ts
```

Expected: failures identify unclear or unstable error surfaces.

- [x] **Step 4: Fix agent-readable errors**

Acceptable fixes:
- clearer Markdown status messages
- consistent `route` / `view.route_path`
- consistent allowed next actions on error pages

Avoid:
- browser-only fixes
- changing default UI only
- swallowing status codes to make tests pass

---

### Task 6: Add Agent Contract Regression Matrix

**Files:**
- Modify: `test/server/agent-consumption-contract.test.ts`
- Modify: `test/server/runtime-json-bridge.test.ts`
- Modify if needed: `src/core/contracts.ts`
- Modify if needed: `src/bridge/json-snapshot-adapter.ts`

- [x] **Step 1: Add matrix tests for action metadata**

Cover:
- action without `transport` defaults to expected method
- blocked action omitted via `allowed_next_actions`
- required inputs preserved
- additional properties behavior preserved
- action target is never rewritten by runtime

- [x] **Step 2: Add matrix tests for state metadata**

Cover:
- `state_id` required
- `state_version` required
- dynamic state version changes do not remove allowed actions
- `view.route_path` preserved across normalized action results

- [x] **Step 3: Run contract matrix**

Run:

```bash
bunx vitest run test/server/agent-consumption-contract.test.ts test/server/runtime-json-bridge.test.ts test/bridge/json-snapshot-adapter.test.ts
```

Expected: PASS.

---

### Task 7: Document The Agent-First Stability Boundary

**Files:**
- Modify: `docs/2026-04-12-agent-consumption-contract.md`
- Modify: `docs/2026-04-11-sdk-feature-backlog.md`
- Modify if needed: `README.md`

- [x] **Step 1: Update backlog status**

In `docs/2026-04-11-sdk-feature-backlog.md`, add a note that current focus is `M1A Agent Consumption Stability`, before broader `M1` web semantics hardening.

- [x] **Step 2: Document how an agent should consume an app**

Include:
- read page
- inspect `allowed_next_actions`
- inspect selected action's `input_schema`
- call target/method
- carry cookies/session
- interpret next route/page/error

- [x] **Step 3: Document known limitations**

Include:
- default UI is not the current hardening target
- object/array inputs are not stable yet
- public SDK openness is deferred
- browser-only semantics are secondary to agent-direct contract for this phase

---

## Verification

Run:

```bash
bunx vitest run test/server/agent-consumption-contract.test.ts test/server/agent-consumption-auth-guestbook.test.ts test/server/agent-consumption-auth-session.test.ts test/server/runtime-json-bridge.test.ts test/server/runtime-json-session-isolation.test.ts
```

Expected: all PASS.

Then run the existing baseline examples:

```bash
bunx vitest run test/server/auth-guestbook-artifact-example.test.ts test/server/auth-session-json-example.test.ts
```

Expected: PASS.

## Exit Criteria

This phase is complete when:

- an agent-flow test can complete `auth-guestbook` without reading HTML
- an agent-flow test can complete `auth-session` without reading HTML
- allowed actions and input schemas are stable enough to construct requests
- session and auth failures remain understandable to agents
- any remaining gaps are documented as non-goals for this phase
