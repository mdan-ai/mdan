# Frontend App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a thin standalone frontend app shell route that boots browser UI and consumes markdown MDAN surfaces without reintroducing server-rendered HTML.

**Architecture:** Keep the server runtime markdown-only. Add a static frontend shell entry that loads the shipped frontend runtime, reads `?route=...`, fetches the corresponding markdown surface, then renders and continues from `@mdanai/sdk/surface` plus `@mdanai/sdk/frontend`. The host adapter may serve the shell as a static asset, but it must not regain HTML projection responsibility for MDAN pages.

**Tech Stack:** TypeScript, Bun/Node host adapters, `@mdanai/sdk/surface`, `@mdanai/sdk/frontend`, Vitest

---

## File Structure

**Create:**

- `src/frontend/app-shell.ts`
  - browser entrypoint for the standalone shell
  - reads `route` from `window.location.search`
  - creates a headless host
  - mounts shipped frontend UI
- `src/frontend/app-shell.html` or a generated shell template helper under `src/frontend/`
  - minimal HTML boot document for the standalone shell
- `test/frontend/app-shell.test.ts`
  - focused contract test for route parsing / boot behavior

**Modify:**

- `scripts/build-browser-bundles.mjs`
  - emit an additional browser bundle for the shell entry
- `src/server/node.ts`
  - optionally expose a static path for the shell bundle or shell HTML if we decide the host serves it
- `src/server/bun.ts`
  - same as Node adapter
- `src/server/static-files.ts`
  - only if we need a content type for the shell asset
- `examples/starter/dev.ts`
  - expose the shell route in local dev
- `examples/starter/README.md`
  - document `/app?route=/...`
- `docs/browser-behavior.md`
  - explain shell boot vs markdown surface fetch
- `docs/custom-rendering.md`
  - explain the difference between shipped shell and custom frontend
- `docs/sdk-packages.md`
  - describe `@mdanai/sdk/frontend` as the shell/frontend layer

**Investigate before coding:**

- whether the shell should be served by host adapters as a reserved static path (recommended first cut: `/app`)
- whether shell HTML should be a checked-in static asset or a tiny generated string

## Task 1: Lock The Browser Entry Contract

**Files:**

- Modify: `docs/browser-behavior.md`
- Modify: `docs/custom-rendering.md`
- Modify: `docs/sdk-packages.md`

- [ ] **Step 1: Write down the shell contract in docs**

Document:

- server pages still return `text/markdown`
- frontend shell is a separate boot path
- shell reads `?route=/target`
- shell fetches markdown surface from that target

- [ ] **Step 2: Sanity-check the wording against current server/runtime behavior**

Run:

```bash
rg -n "text/html|browser shell|/app\\?route" docs src examples
```

Expected: docs describe markdown-only transport and a standalone frontend shell; no reintroduction of server HTML page rendering.

## Task 2: Add The Frontend Shell Entry

**Files:**

- Create: `src/frontend/app-shell.ts`
- Create: `src/frontend/app-shell.html` or `src/frontend/app-shell-template.ts`
- Test: `test/frontend/app-shell.test.ts`

- [ ] **Step 1: Write the failing test for route extraction and boot defaults**

Test behaviors:

- missing `route` falls back to `/`
- `?route=/login` boots against `/login`
- shell uses `createHeadlessHost({ initialRoute, fetchImpl })`

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```bash
bunx vitest run test/frontend/app-shell.test.ts
```

Expected: FAIL because the shell entry does not exist yet.

- [ ] **Step 3: Implement the minimal shell runtime**

Implementation requirements:

- parse `route` from `window.location.search`
- create a headless host
- mount the shipped UI with `mountMdanUi(...)`
- call `host.mount()` and `host.sync(route)`
- avoid any server-only imports

- [ ] **Step 4: Run the focused shell test**

Run:

```bash
bunx vitest run test/frontend/app-shell.test.ts
```

Expected: PASS

## Task 3: Ship The Shell As A Browser Asset

**Files:**

- Modify: `scripts/build-browser-bundles.mjs`
- Modify: `src/server/node.ts`
- Modify: `src/server/bun.ts`
- Modify: `src/server/host-shared.ts`
- Test: `test/server/adapter-shared.test.ts`

- [ ] **Step 1: Write the failing adapter/asset test**

Add assertions for the chosen shell path, for example:

- `/app` serves shell HTML
- `/__mdan/app-shell.js` serves the shell bundle

- [ ] **Step 2: Run the focused host/adapter tests to verify failure**

Run:

```bash
bunx vitest run test/server/adapter-shared.test.ts test/server/host-flow-shared.test.ts
```

Expected: FAIL because the shell asset path is not wired yet.

- [ ] **Step 3: Implement the minimal host wiring**

Constraints:

- host may serve the shell asset and thin boot HTML
- host must not render MDAN pages as HTML
- business routes like `/login` still go to markdown runtime unchanged

- [ ] **Step 4: Run focused host tests**

Run:

```bash
bunx vitest run test/server/adapter-shared.test.ts test/server/host-flow-shared.test.ts
```

Expected: PASS

## Task 4: Prove The Flow In Starter

**Files:**

- Modify: `examples/starter/dev.ts`
- Modify: `examples/starter/README.md`
- Modify: `docs/quickstart.md`
- Test: `test/elements/headless-host-integration.test.ts`

- [ ] **Step 1: Add or update the integration test**

Cover:

- loading the shell
- requesting a markdown route through `?route=/`
- mounting UI from the returned surface

- [ ] **Step 2: Run the focused integration test to verify failure**

Run:

```bash
bunx vitest run test/elements/headless-host-integration.test.ts
```

Expected: FAIL until the shell path is live.

- [ ] **Step 3: Update starter dev wiring and docs**

Document:

- `/` remains markdown
- `/app?route=/` is the browser shell entry

- [ ] **Step 4: Run the focused integration test again**

Run:

```bash
bunx vitest run test/elements/headless-host-integration.test.ts
```

Expected: PASS

## Task 5: Verify The Whole Cut

**Files:**

- Verify only

- [ ] **Step 1: Run targeted verification**

```bash
bunx vitest run test/frontend/app-shell.test.ts test/server/adapter-shared.test.ts test/server/host-flow-shared.test.ts test/elements/headless-host-integration.test.ts
```

Expected: PASS

- [ ] **Step 2: Run typecheck**

```bash
bunx tsc -p tsconfig.json --noEmit
```

Expected: PASS

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: PASS

- [ ] **Step 4: Run full build**

```bash
npm run build
```

Expected: PASS
