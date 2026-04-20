# M1 Core Semantics Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the SDK's core web interaction semantics so teams can develop real MDAN apps without repeatedly hitting route/action/history/input-type inconsistencies across HTML, headless, and the default UI.

**Architecture:** Treat `server/runtime` as the semantic source of truth, `web/headless` as the browser/runtime behavior model, and `elements` as a consumer rather than a second source of behavior. Use tests to lock cross-mode semantics first, then tighten typed input, no-JS form behavior, and default UI error/loading/session flows around those rules.

**Tech Stack:** TypeScript, Bun, Vitest, MDAN server runtime, headless web runtime, Lit-based default UI

---

## File Map

**Core semantic sources**
- Modify: `src/server/runtime.ts`
- Modify: `src/server/html-render.ts`
- Modify: `src/server/adapter-shared.ts`
- Modify: `src/server/types.ts`
- Modify: `src/web/headless.ts`
- Modify: `src/web/protocol.ts`
- Modify: `src/elements/mount.ts`
- Modify: `src/elements/model.ts`
- Modify: `src/shared/render-semantics.ts`
- Modify: `src/core/types.ts`
- Modify: `src/core/input-schema.ts`

**Examples used as proving grounds**
- Modify: `examples/auth-guestbook/app.ts`
- Modify: `examples/auth-guestbook/app/actions/login.json`
- Modify: `examples/auth-guestbook/app/actions/register.json`
- Modify: `examples/auth-guestbook/app/actions/guestbook.json`
- Modify: `examples/auth-session/app.ts`
- Modify: `examples/auth-session/app/actions/login.json`
- Modify: `examples/auth-session/app/actions/register.json`
- Modify: `examples/auth-session/app/actions/vault.json`

**Primary test suites**
- Modify: `test/server/auth-guestbook-artifact-example.test.ts`
- Modify: `test/server/auth-session-json-example.test.ts`
- Modify: `test/server/runtime-html-mode.test.ts`
- Modify: `test/server/runtime-json-bridge.test.ts`
- Modify: `test/server/html-render.test.ts`
- Modify: `test/web/headless-browser-flow.test.ts`
- Modify: `test/web/headless-transition.test.ts`
- Modify: `test/elements/model.test.ts`
- Modify: `test/shared/sse-render-semantics.test.ts`

**Optional documentation updates at the end**
- Modify: `README.md`
- Modify: `docs/2026-04-11-sdk-feature-backlog.md`

---

### Task 1: Freeze The Current Semantic Contract

**Files:**
- Reference: `docs/2026-04-11-sdk-feature-backlog.md`
- Reference: `src/server/runtime.ts`
- Reference: `src/web/headless.ts`
- Reference: `src/elements/mount.ts`
- Reference: `examples/auth-guestbook/app.ts`
- Reference: `examples/auth-session/app.ts`

- [ ] **Step 1: Record the M1 rules in working notes**

Write down the rules before making changes:

```text
1. Page routes and action endpoints may differ.
2. HTML success navigation must end at the semantic page route, not the action endpoint.
3. Failure responses must preserve actionable error content and must not mis-redirect.
4. Headless/browser/default UI must agree on route, transition, and error semantics.
5. Handler inputs must move toward typed values, starting with number/integer/boolean.
```

- [ ] **Step 2: Capture the current hotspots**

Run:

```bash
rg -n 'route|pushState|stateEffect|updatedRegions|content-type|application/x-www-form-urlencoded|multipart/form-data|status: "error"|status: "loading"' src test examples
```

Expected: matches in `src/server/runtime.ts`, `src/web/headless.ts`, `src/elements/mount.ts`, `src/server/adapter-shared.ts`, and the auth example tests.

- [ ] **Step 3: Confirm the proving-ground examples**

Run:

```bash
rg -n 'auth-guestbook|auth-session' examples test/server
```

Expected: both examples and their test files are the primary end-to-end semantic fixtures.

---

### Task 2: Lock Route And Navigation Semantics Across HTML And Headless

**Files:**
- Modify: `src/server/runtime.ts`
- Modify: `src/web/headless.ts`
- Modify: `test/server/auth-guestbook-artifact-example.test.ts`
- Modify: `test/server/auth-session-json-example.test.ts`
- Modify: `test/server/runtime-html-mode.test.ts`
- Modify: `test/web/headless-browser-flow.test.ts`
- Modify: `test/web/headless-transition.test.ts`

- [ ] **Step 1: Add failing tests for semantic navigation**

Cover these cases:

```ts
expect(successfulHtmlPost.status).toBe(303);
expect(successfulHtmlPost.headers.location).toBe("/guestbook");

expect(failedHtmlPost.status).toBe(401);
expect(failedHtmlPost.headers.location).toBeUndefined();

expect(pushState).toHaveBeenCalledWith({}, "", "/next");
expect(pushState).not.toHaveBeenCalledWith({}, "", "/auth/login");
```

- [ ] **Step 2: Run the navigation-focused tests and verify they fail for the intended reason**

Run:

```bash
bunx vitest run test/server/auth-guestbook-artifact-example.test.ts test/server/auth-session-json-example.test.ts test/server/runtime-html-mode.test.ts test/web/headless-browser-flow.test.ts test/web/headless-transition.test.ts
```

Expected: failures tied to incorrect redirect/location/history behavior, not syntax errors.

- [ ] **Step 3: Make `server/runtime` the HTML navigation authority**

Update `src/server/runtime.ts` so successful HTML `POST` results with a declared `route` become `303 See Other` responses, while failed results remain inline HTML/markdown responses.

Implementation target:

```ts
if (request.method === "POST" && representation === "html" && isSuccess(result) && result.route) {
  return {
    status: 303,
    headers: { location: result.route, ...sessionHeaders },
    body: ""
  };
}
```

- [ ] **Step 4: Keep headless/browser route semantics aligned**

In `src/web/headless.ts`, verify that:
- page responses push the semantic route
- region responses do not push history
- errors enter `status: "error"` rather than mutating route unexpectedly

Only change code if tests show drift.

- [ ] **Step 5: Run the navigation-focused tests again**

Run the same command from Step 2.

Expected: all targeted navigation tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server/runtime.ts src/web/headless.ts test/server/auth-guestbook-artifact-example.test.ts test/server/auth-session-json-example.test.ts test/server/runtime-html-mode.test.ts test/web/headless-browser-flow.test.ts test/web/headless-transition.test.ts
git commit -m "fix: unify html and headless navigation semantics"
```

---

### Task 3: Harden Example Action Targets As Semantic Fixtures

**Files:**
- Modify: `examples/auth-guestbook/app.ts`
- Modify: `examples/auth-guestbook/app/actions/login.json`
- Modify: `examples/auth-guestbook/app/actions/register.json`
- Modify: `examples/auth-guestbook/app/actions/guestbook.json`
- Modify: `examples/auth-session/app.ts`
- Modify: `examples/auth-session/app/actions/login.json`
- Modify: `examples/auth-session/app/actions/register.json`
- Modify: `examples/auth-session/app/actions/vault.json`
- Modify: `test/server/auth-guestbook-artifact-example.test.ts`
- Modify: `test/server/auth-session-json-example.test.ts`

- [ ] **Step 1: Add failing assertions that examples keep semantic page routes and explicit action endpoints**

Examples:

```ts
expect(html).toContain('action="/auth/login"');
expect(html).toContain('action="/guestbook/post"');
expect(html).toContain('action="/guestbook/logout"');
expect(html).toContain('action="/vault/logout"');
```

- [ ] **Step 2: Run the example tests to verify fixture drift is caught**

Run:

```bash
bunx vitest run test/server/auth-guestbook-artifact-example.test.ts test/server/auth-session-json-example.test.ts
```

Expected: failures if example action targets no longer match server routes.

- [ ] **Step 3: Align example server routes and action specs**

Ensure:
- page routes stay semantic: `/login`, `/register`, `/guestbook`, `/vault`
- action endpoints stay explicit where appropriate: `/auth/login`, `/auth/register`, `/guestbook/post`, `/guestbook/logout`, `/vault/logout`
- examples rely on SDK semantics rather than collapsing action endpoints into page routes

- [ ] **Step 4: Re-run the example tests**

Run the same command from Step 2.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add examples/auth-guestbook examples/auth-session test/server/auth-guestbook-artifact-example.test.ts test/server/auth-session-json-example.test.ts
git commit -m "test: lock example route and action semantics"
```

---

### Task 4: Close The No-JS Form Compatibility Gaps

**Files:**
- Modify: `src/server/adapter-shared.ts`
- Modify: `src/server/runtime.ts`
- Modify: `src/server/html-render.ts`
- Modify: `src/server/node.ts`
- Modify: `src/server/bun.ts`
- Modify: `test/server/adapter-shared.test.ts`
- Modify: `test/server/runtime-html-mode.test.ts`
- Modify: `test/server/auth-guestbook-artifact-example.test.ts`
- Modify: `test/server/auth-session-json-example.test.ts`

- [ ] **Step 1: Add failing tests for form-encoded and multipart no-JS flows**

Cover:

- login/register with `application/x-www-form-urlencoded`
- message/note submit with form-encoded body
- file upload path where relevant fixtures already exist

- [ ] **Step 2: Run the no-JS compatibility tests and verify they fail**

Run:

```bash
bunx vitest run test/server/adapter-shared.test.ts test/server/runtime-html-mode.test.ts test/server/auth-guestbook-artifact-example.test.ts test/server/auth-session-json-example.test.ts
```

Expected: failures point to missing normalization or action/input wrapper mismatches.

- [ ] **Step 3: Normalize form submissions without requiring example-specific hacks**

In `src/server/adapter-shared.ts`, `src/server/runtime.ts`, `src/server/node.ts`, and `src/server/bun.ts`:
- keep form-encoded and multipart normalization aligned with JSON body semantics
- ensure action metadata and input payload can coexist in no-JS submissions
- preserve PRG behavior for successful HTML `POST`
- verify Node and Bun hosts behave the same as direct `server.handle()` tests

- [ ] **Step 4: Verify HTML renderer emits compatible forms**

In `src/server/html-render.ts`, verify the emitted forms still work in plain browser mode after normalization changes. Only adjust generated hidden fields or form metadata if tests require it.

- [ ] **Step 5: Re-run the no-JS compatibility tests**

Run the same command from Step 2.

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server/adapter-shared.ts src/server/runtime.ts src/server/html-render.ts src/server/node.ts src/server/bun.ts test/server/adapter-shared.test.ts test/server/runtime-html-mode.test.ts test/server/auth-guestbook-artifact-example.test.ts test/server/auth-session-json-example.test.ts
git commit -m "fix: close no-js form compatibility gaps"
```

---

### Task 5: Introduce Typed Coercion For Scalar Input Kinds

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/core/input-schema.ts`
- Modify: `src/server/runtime.ts`
- Modify: `src/server/types.ts`
- Modify: `test/server/runtime-json-bridge.test.ts`
- Modify: `test/server/runtime-html-mode.test.ts`
- Create or modify targeted coercion tests near existing runtime suites

- [ ] **Step 1: Add failing tests for typed scalar inputs**

Cover at least:

```ts
expect(typeof received.count).toBe("number");
expect(received.count).toBe(3);
expect(typeof received.enabled).toBe("boolean");
expect(received.enabled).toBe(true);
```

Use both JSON request bodies and already-normalized form-encoded submissions where possible. Do not make this task responsible for creating the normalization path; that belongs to Task 4.

- [ ] **Step 2: Run the scalar coercion tests and verify they fail**

Run a focused suite, for example:

```bash
bunx vitest run test/server/runtime-json-bridge.test.ts test/server/runtime-html-mode.test.ts
```

Expected: failures show stringly-typed handler inputs.

- [ ] **Step 3: Extend the runtime coercion pipeline**

In `src/server/runtime.ts` and supporting schema utilities:
- map incoming validated values through `FieldSchema.kind` / normalized schema type
- coerce `number`, `integer`, and `boolean` into typed values before handler delivery
- preserve existing behavior for strings and asset handles

Implementation target:

```ts
function coerceInputValue(raw: unknown, schema: FieldSchema | JsonSchemaLike): unknown {
  // string -> number/boolean when schema requires it
}
```

- [ ] **Step 4: Keep error messages and validation consistent**

Do not silently coerce invalid values into nonsense. Invalid `"abc"` for `number` should still produce a structured validation error.

- [ ] **Step 5: Re-run the scalar coercion tests**

Run the same command from Step 2.

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/types.ts src/core/input-schema.ts src/server/runtime.ts src/server/types.ts test/server/runtime-json-bridge.test.ts test/server/runtime-html-mode.test.ts
git commit -m "feat: add typed scalar input coercion"
```

---

### Task 6: Unify Error-State Semantics Across Runtime, Headless, And Default UI

**Files:**
- Modify: `src/server/runtime.ts`
- Modify: `src/server/types.ts`
- Modify: `src/web/headless.ts`
- Modify: `src/web/protocol.ts`
- Modify: `src/elements/mount.ts`
- Modify: `src/elements/model.ts`
- Modify: `test/web/headless-browser-flow.test.ts`
- Modify: `test/web/headless-transition.test.ts`
- Modify: `test/server/runtime-html-mode.test.ts`
- Modify: `test/server/html-render.test.ts`

- [ ] **Step 1: Add failing tests for structured error-state behavior**

Cover:
- invalid credentials
- session-expired write action
- unsupported media type
- missing route / not found

Examples:

```ts
expect(snapshot.status).toBe("error");
expect(snapshot.error?.kind).toBe("auth");
expect(snapshot.error?.message).toContain("Invalid");
expect(html).toContain("Session expired");
```

- [ ] **Step 2: Run the error-state tests and verify they fail correctly**

Run:

```bash
bunx vitest run test/server/runtime-html-mode.test.ts test/server/html-render.test.ts test/web/headless-browser-flow.test.ts test/web/headless-transition.test.ts
```

Expected: failures reflect inconsistent error propagation or missing UI handling.

- [ ] **Step 3: Define a minimal cross-layer error contract**

Create one shared minimal structure that runtime, headless, and default UI all use. Prefer extending existing snapshot/response-adjacent types over inventing a separate parallel system.

Implementation target:

```ts
type MdanUiError = {
  kind: "validation" | "auth" | "not-found" | "unsupported-media-type" | "runtime";
  message: string;
};
```

- [ ] **Step 4: Update headless error handling**

In `src/web/headless.ts` and `src/web/protocol.ts`, ensure non-2xx responses consistently enter `status: "error"` with readable structured errors, without corrupting route history.

- [ ] **Step 5: Update default UI error presentation**

In `src/elements/mount.ts` and supporting model helpers:
- surface the shared error structure consistently
- avoid silent failure
- preserve the current page snapshot when appropriate

- [ ] **Step 6: Re-run the error-state tests**

Run the same command from Step 2.

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/server/runtime.ts src/server/types.ts src/web/headless.ts src/web/protocol.ts src/elements/mount.ts src/elements/model.ts test/server/runtime-html-mode.test.ts test/server/html-render.test.ts test/web/headless-browser-flow.test.ts test/web/headless-transition.test.ts
git commit -m "fix: unify runtime and ui error semantics"
```

---

### Task 7: Stabilize Default UI Loading, Transition, And Session Flows

**Files:**
- Modify: `src/elements/mount.ts`
- Modify: `src/elements/model.ts`
- Modify: `src/web/headless.ts`
- Modify: `test/elements/model.test.ts`
- Modify: `test/web/headless-transition.test.ts`
- Modify: `test/web/headless-browser-flow.test.ts`

- [ ] **Step 1: Add failing tests for default UI stability**

Cover:
- loading indicator or state transition visibility
- session-expired write action returning to login
- region patch leaving untouched blocks alone
- back/popstate after page transitions

- [ ] **Step 2: Run the UI stability tests and verify they fail**

Run:

```bash
bunx vitest run test/elements/model.test.ts test/web/headless-browser-flow.test.ts test/web/headless-transition.test.ts
```

Expected: failures identify UI drift, not unrelated runtime breakage.

- [ ] **Step 3: Refine the UI model and mount behavior**

Ensure `elements` remains a consumer of host semantics:
- no duplicate route logic in the UI layer
- loading/error/transition state comes from host snapshot
- UI clears or preserves form values intentionally after submit

- [ ] **Step 4: Re-run the UI stability tests**

Run the same command from Step 2.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/elements/mount.ts src/elements/model.ts src/web/headless.ts test/elements/model.test.ts test/web/headless-browser-flow.test.ts test/web/headless-transition.test.ts
git commit -m "fix: stabilize default ui interaction flows"
```

---

### Task 8: Final M1 Verification And Documentation Sweep

**Files:**
- Modify: `README.md` if public guidance changed materially
- Modify: `docs/2026-04-11-sdk-feature-backlog.md`
- Reference: all files touched in Tasks 1-7

- [ ] **Step 1: Run the complete M1 verification suite**

Run:

```bash
bunx vitest run test/server test/web test/elements test/shared
```

Expected: all targeted M1 suites PASS.

- [ ] **Step 2: Manually smoke the two auth examples**

Run:

```bash
bun run dev:auth-guestbook
bun run dev:auth-session
```

Verify in a browser or via `curl`:
- login/register success redirects to semantic page routes
- failure responses render actionable errors
- write actions and logout still work

- [ ] **Step 3: Update docs if behavior or recommendations changed**

At minimum, document:
- HTML success `POST` navigation semantics
- typed scalar input support
- no-JS form expectations

- [ ] **Step 4: Record remaining post-M1 risks**

Add short notes for what intentionally stays for M2:
- `object` / `array` editors
- storage adapter formalization
- richer upload UX
- real app sample

- [ ] **Step 5: Commit**

```bash
git add README.md docs/2026-04-11-sdk-feature-backlog.md
git commit -m "docs: record m1 semantics hardening outcomes"
```

---

## Exit Criteria

M1 is complete when all of the following are true:

- HTML, headless, and default UI agree on success navigation and error behavior.
- Auth examples no longer rely on route/action workarounds in example code.
- Scalar typed inputs are no longer primarily stringly typed in handlers.
- no-JS form submissions work for the core write flows.
- The default UI is stable enough to serve as a reliable baseline rather than just a demo renderer.

## Recommended Execution Order

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6
7. Task 7
8. Task 8
