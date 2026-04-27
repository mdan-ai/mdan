# Browser Bootstrap And Auto Semantics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split browser-first initialization from general auto dependencies, keep static auto as the default path, and narrow dynamic auto into a well-defined advanced runtime override.

**Architecture:** Preserve the current static/dynamic auto engine, but add a separate browser-bootstrap path that is only triggered by frontend entry first-load requests. The frontend entry should carry an SDK-owned bootstrap intent marker automatically; runtime should detect it and invoke browser bootstrap without making app authors invent custom headers or overload dynamic auto with browser-only semantics.

**Tech Stack:** TypeScript, Bun/Node host adapters, frontend entry runtime, MDAN server runtime, Vitest

---

## File Structure

**Create:**

- `test/frontend/browser-bootstrap-entry.test.ts`
  - verifies frontend entry sends the SDK-owned bootstrap intent only for first-load browser requests
- `test/server/browser-bootstrap.test.ts`
  - verifies runtime bootstrap behavior, non-browser behavior, and bootstrap result handling
- `docs/browser-bootstrap.md`
  - standalone user-facing guide for the new model

**Modify:**

- `src/frontend/entry.ts`
  - attach SDK-owned browser bootstrap intent to the first entry-driven request
  - keep later `visit/sync/submit` behavior unchanged unless explicitly required
- `src/frontend/contracts.ts`
  - only if a stable type is needed for entry bootstrap signaling
- `src/server/runtime.ts`
  - detect browser bootstrap requests
  - invoke bootstrap hook before normal page handling
  - keep agent-facing markdown reads unchanged
- `src/app/index.ts`
  - add app-facing bootstrap declaration API
  - map it into runtime options cleanly
- `src/server/types/*`
  - only if a new context/result type is needed for browser bootstrap
- `src/server/auto-dependencies.ts`
  - docs-only or small cleanup if context typing needs a clearer separation from bootstrap
- `docs/auto-dependencies.md`
  - reposition dynamic auto as advanced runtime override
- `docs/browser-behavior.md`
  - describe SDK-owned entry bootstrap signaling
- `docs/api-reference.md`
  - document bootstrap API and browser entry/runtime semantics
- `docs/quickstart.md`
  - point new browser-first initialization use cases at bootstrap instead of dynamic auto
- `docs/superpowers/specs/2026-04-25-browser-bootstrap-and-auto-semantics-design.md`
  - only if implementation reveals small spec clarifications

**Relevant existing files to read before coding:**

- `src/frontend/entry.ts`
- `src/server/runtime.ts`
- `src/server/auto-dependencies.ts`
- `src/app/index.ts`
- `test/server/auto-dependencies.test.ts`
- `test/frontend/entry.test.ts`
- `docs/auto-dependencies.md`

## Task 1: Lock The Current Auto Semantics In Tests

**Files:**

- Modify: `test/server/auto-dependencies.test.ts`

- [ ] **Step 1: Add failing tests that distinguish general auto from browser bootstrap**

Add tests that make the desired split explicit:

- a normal markdown GET read does **not** trigger browser bootstrap
- static auto still executes without any bootstrap intent
- dynamic auto still works for non-browser dependency resolution

- [ ] **Step 2: Run the focused auto dependency suite and verify the new tests fail**

Run:

```bash
bunx vitest run test/server/auto-dependencies.test.ts
```

Expected: FAIL because browser bootstrap does not exist yet.

- [ ] **Step 3: Do not modify auto behavior yet**

Before adding bootstrap, confirm the existing tests still express current auto semantics clearly:

- static auto is still default
- dynamic auto is still a request override
- auto result semantics remain unchanged

- [ ] **Step 4: Commit the test-only red state once the failure is correct**

```bash
git add test/server/auto-dependencies.test.ts
git commit -m "test: pin auto semantics before bootstrap split"
```

## Task 2: Add SDK-Owned Browser Entry Bootstrap Intent

**Files:**

- Modify: `src/frontend/entry.ts`
- Test: `test/frontend/browser-bootstrap-entry.test.ts`

- [ ] **Step 1: Write the failing frontend entry tests**

Cover these cases:

- initial `boot`/first `sync` request carries an SDK-owned bootstrap intent marker
- later requests do not incorrectly masquerade as first-load bootstrap
- direct `.md` fetches or non-entry fetches do not get the marker automatically

- [ ] **Step 2: Run the new frontend entry tests to verify failure**

Run:

```bash
bunx vitest run test/frontend/browser-bootstrap-entry.test.ts
```

Expected: FAIL because entry bootstrap signaling is not implemented yet.

- [ ] **Step 3: Implement the minimal frontend entry signaling**

Implementation requirements:

- signal must be SDK-owned and internal
- app code must not configure it
- signal must only apply to entry-driven first-load semantics
- avoid leaking this marker into generic runtime requests unnecessarily

- [ ] **Step 4: Run the focused frontend tests**

Run:

```bash
bunx vitest run test/frontend/browser-bootstrap-entry.test.ts test/frontend/entry.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/frontend/entry.ts test/frontend/browser-bootstrap-entry.test.ts test/frontend/entry.test.ts
git commit -m "feat: add browser bootstrap intent to frontend entry"
```

## Task 3: Add App-Facing Browser Bootstrap Declaration

**Files:**

- Modify: `src/app/index.ts`
- Modify: `src/server/runtime.ts`
- Modify: `src/server/types/*` (if needed)
- Test: `test/server/browser-bootstrap.test.ts`

- [ ] **Step 1: Write the failing runtime/bootstrap tests**

Add focused tests for:

- app can declare a browser bootstrap hook
- runtime invokes it only for entry bootstrap requests
- agent-facing markdown reads bypass it
- bootstrap can return a page result
- bootstrap can return a fragment result

- [ ] **Step 2: Run the bootstrap test file to verify failure**

Run:

```bash
bunx vitest run test/server/browser-bootstrap.test.ts
```

Expected: FAIL because the runtime and app API do not yet support bootstrap.

- [ ] **Step 3: Implement the app-facing bootstrap API**

Constraints:

- keep it separate from `auto`
- keep the API at the app-facing layer
- avoid requiring app authors to know transport/header details
- do not mix browser bootstrap into general route/action semantics

- [ ] **Step 4: Implement runtime detection and bootstrap execution**

Requirements:

- bootstrap only runs for browser-entry first-load intent
- normal markdown/agent reads do not trigger it
- runtime must accept page or fragment results
- result handling should reuse normal page/fragment result normalization where possible

- [ ] **Step 5: Run the focused bootstrap tests**

Run:

```bash
bunx vitest run test/server/browser-bootstrap.test.ts test/app-api.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/index.ts src/server/runtime.ts src/server/types test/server/browser-bootstrap.test.ts test/app-api.test.ts
git commit -m "feat: add browser bootstrap runtime path"
```

## Task 4: Reposition Dynamic Auto As An Advanced Override

**Files:**

- Modify: `src/server/auto-dependencies.ts`
- Modify: `docs/auto-dependencies.md`
- Modify: `docs/api-reference.md`

- [ ] **Step 1: Write or update tests only if runtime contract changes are needed**

If implementation adds explicit reason/context typing, add targeted tests for:

- dynamic auto context remains stable for auto dependencies
- bootstrap is not routed through dynamic auto

- [ ] **Step 2: Keep code changes minimal**

Only change runtime code here if needed to:

- make dynamic auto context clearer
- ensure bootstrap and auto do not share implicit control flow

Do **not** redesign auto behavior itself unless tests prove it is necessary.

- [ ] **Step 3: Rewrite docs positioning**

Update docs to say:

- use static auto first
- use browser bootstrap for first browser entry initialization
- use dynamic auto only when a runtime-computed GET request is genuinely needed

- [ ] **Step 4: Run focused tests**

Run:

```bash
bunx vitest run test/server/auto-dependencies.test.ts test/server/browser-bootstrap.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/auto-dependencies.ts docs/auto-dependencies.md docs/api-reference.md test/server/auto-dependencies.test.ts test/server/browser-bootstrap.test.ts
git commit -m "docs: reposition dynamic auto after bootstrap split"
```

## Task 5: Add A Browser Bootstrap Guide And Migration Story

**Files:**

- Create: `docs/browser-bootstrap.md`
- Modify: `docs/browser-behavior.md`
- Modify: `docs/quickstart.md`
- Modify: `docs/index.md`

- [ ] **Step 1: Write the new guide**

Cover:

- what browser bootstrap is
- when to use it
- how it differs from auto
- why app code does not need custom headers
- page result vs fragment result guidance

- [ ] **Step 2: Add migration guidance**

Document how to move browser-first dynamic auto use cases into bootstrap:

- location-based initialization
- login recovery
- browser permission gating

- [ ] **Step 3: Update docs navigation**

Make sure `docs/index.md` links to the new guide and the relationship among:

- browser bootstrap
- auto dependencies
- browser behavior

is easy to discover.

- [ ] **Step 4: Run docs guidance tests**

Run:

```bash
bunx vitest run test/docs-guidance.test.ts test/readme.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docs/browser-bootstrap.md docs/browser-behavior.md docs/quickstart.md docs/index.md test/docs-guidance.test.ts test/readme.test.ts
git commit -m "docs: add browser bootstrap guide"
```

## Task 6: End-To-End Verification

**Files:**

- Verify only

- [ ] **Step 1: Run the focused implementation suites**

Run:

```bash
bunx vitest run test/frontend/browser-bootstrap-entry.test.ts test/server/browser-bootstrap.test.ts test/server/auto-dependencies.test.ts test/app-api.test.ts
```

Expected: PASS

- [ ] **Step 2: Run the broader regression suites**

Run:

```bash
bunx vitest run test
```

Expected: PASS

- [ ] **Step 3: Run typecheck and build**

Run:

```bash
bunx tsc -p tsconfig.json --noEmit
npm run build
```

Expected: PASS

- [ ] **Step 4: Manually verify an example flow if bootstrap is wired into one**

Suggested smoke check:

```bash
PORT=47901 bun run examples/form-customization/dev.ts
```

Verify:

- normal agent/raw `.md` read stays bootstrap-free
- browser entry first load takes the bootstrap path only when intended

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: add browser bootstrap semantics"
```

## Notes For The Implementer

- Do not let browser bootstrap reintroduce server-side presentation logic.
- Do not make app authors aware of the internal entry/request bridge.
- Do not collapse bootstrap back into dynamic auto during implementation.
- Keep static auto semantics untouched unless a failing test proves a necessary correction.
