# Server Runtime Boundary Tightening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `src/server/runtime.ts` so request orchestration stays behaviorally identical while page/action flows and session commit logic move into focused private helpers.

**Architecture:** Keep `createMdanServer()` as the public entry and preserve all current runtime behavior. Extract helper functions inside `src/server/runtime.ts` first so the file reads as orchestration over well-named steps without introducing new public modules or cross-layer churn.

**Tech Stack:** TypeScript, Vitest, MDAN server runtime

---

### Task 1: Lock In The Refactor Shape

**Files:**
- Modify: `test/module-boundaries.test.ts`
- Test: `test/module-boundaries.test.ts`

- [ ] **Step 1: Write the failing test**

Add a source-structure assertion that `src/server/runtime.ts` contains private `handlePageRequest` and `handleActionRequest` helpers and that `createMdanServer()` delegates to them.

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run test/module-boundaries.test.ts`
Expected: FAIL because `src/server/runtime.ts` still inlines both flows.

- [ ] **Step 3: Write minimal implementation**

Extract helper functions within `src/server/runtime.ts` only. Do not change public types, imports across layers, or behavior.

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run test/module-boundaries.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

Commit after runtime extraction and regression tests are green.

### Task 2: Preserve Runtime Behavior

**Files:**
- Modify: `src/server/runtime.ts`
- Test: `test/server/*.test.ts`

- [ ] **Step 1: Re-run targeted runtime tests**

Run: `bunx vitest run test/server/runtime-json-surface.test.ts test/server/runtime-action-proof.test.ts test/server/public-api.test.ts`
Expected: PASS before any cleanup claims.

- [ ] **Step 2: Tighten shared helpers**

Extract `commitSessionMutation` and compact repeated error-response branches only if behavior remains byte-for-byte equivalent in existing tests.

- [ ] **Step 3: Re-run targeted runtime tests**

Run: `bunx vitest run test/server/runtime-json-surface.test.ts test/server/runtime-action-proof.test.ts test/server/public-api.test.ts`
Expected: PASS

- [ ] **Step 4: Run full baseline**

Run: `bun run test:baseline`
Expected: PASS
