# HTML Projection Browser Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in browser host mode that returns SEO-readable HTML from the final MDAN surface while preserving the existing client projection mode.

**Architecture:** Keep `/page.md` as the canonical markdown surface and keep current browser shell behavior as the default. Add a `browser.projection: "html"` host option that uses the same runtime request already used for initial markdown, renders readable markdown into the HTML document body, and still passes `initialMarkdown` to the frontend for enhancement.

**Tech Stack:** TypeScript, Vitest, Node/Bun host adapters, existing `basicMarkdownRenderer`, existing frontend entry boot options.

---

### Task 1: Host Frontend HTML Projection Helper

**Files:**
- Modify: `src/server/host/frontend.ts`
- Test: `test/server/host-frontend.test.ts`

- [x] **Step 1: Write failing tests**

Test that `renderBuiltinFrontendEntryHtml(..., { projection: "html", initialMarkdown })` includes rendered markdown in `[data-mdan-ui-root]`, strips frontmatter/executable fences, and still passes `initialMarkdown` into `autoBoot`.

- [x] **Step 2: Run test to verify it fails**

Run: `bunx vitest run test/server/host-frontend.test.ts`

- [x] **Step 3: Implement minimal projection helper**

Extend `FrontendEntryHtmlOptions` with `projection?: "client" | "html"`, render with `basicMarkdownRenderer` only for `"html"`, and keep the default body empty for `"client"`.

- [x] **Step 4: Run test to verify it passes**

Run: `bunx vitest run test/server/host-frontend.test.ts`

### Task 2: Host Adapter Options

**Files:**
- Modify: `src/server/host/shared.ts`
- Modify: `src/server/node.ts`
- Modify: `src/server/bun.ts`
- Test: `test/server/router.test.ts`

- [x] **Step 1: Write failing tests**

Add planner tests showing natural browser routes still return the frontend entry when `frontend` is enabled and that projection mode does not affect `.md` routes.

- [x] **Step 2: Run tests to verify failure**

Run: `bunx vitest run test/server/router.test.ts`

- [x] **Step 3: Implement options**

Add `browser?: { projection?: "client" | "html" }` to host options and pass the selected projection into `renderBuiltinFrontendEntryHtml`.

- [x] **Step 4: Run focused tests**

Run: `bunx vitest run test/server/host-frontend.test.ts test/server/router.test.ts`

### Task 3: Documentation

**Files:**
- Modify: `docs/routing.md`
- Modify: `docs/browser-behavior.md`
- Modify: `docs/choose-a-rendering-path.md`

- [x] **Step 1: Document both browser modes**

Explain client projection as the current/default path and HTML projection as opt-in SEO/readable-first behavior.

- [x] **Step 2: Verify docs tests**

Run: `bunx vitest run test/docs-guidance.test.ts test/readme.test.ts`

### Task 4: Full Verification

**Files:**
- No production changes.

- [x] **Step 1: Run baseline relevant tests**

Run: `bunx vitest run test/server/host-frontend.test.ts test/server/router.test.ts test/server/browser-bootstrap.test.ts test/frontend/entry.test.ts`

- [x] **Step 2: Run package tests if focused tests pass**

Run: `npm test`
