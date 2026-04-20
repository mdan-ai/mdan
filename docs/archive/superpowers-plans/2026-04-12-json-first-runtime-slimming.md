# JSON-First Runtime Slimming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make JSON surface bundles the primary runtime and browser interaction path, keep Markdown readout, and deprecate/remove server-side HTML rendering.

**Architecture:** Source authoring can stay split as Markdown content templates plus JSON action contracts. Runtime responses should converge on `SurfaceBundle` JSON for interactive consumers and `text/markdown` for readable/export/debug consumers. Browser UI should be rendered by the frontend SDK from JSON bundles, not by server-generated HTML/bootstrap.

**Tech Stack:** TypeScript, Bun, Vitest, MDAN server runtime, JSON surface bundles, web headless runtime, Lit elements renderer

---

## Summary

We are no longer optimizing around server-rendered HTML as the product center. The runtime center is a JSON bundle that carries Markdown content, JSON actions, and view/state metadata.

```text
source authoring:
  content.md + actions.json

runtime interaction:
  SurfaceBundle JSON

readable/debug output:
  text/markdown

legacy adapter:
  server-rendered text/html
```

This preserves Markdown as the content/prompt language and JSON as the execution contract, while avoiding the extra round trips and ambiguity of making agents fetch content and actions separately.

## Target Split

Keep:

- `application/json`: primary interactive representation for agents and frontend SDK.
- `text/markdown`: read-only content representation for LLM ingest, docs export, curl/debug, and human-readable protocol inspection.
- Source files as `content.md` plus `actions.json` where useful for authoring clarity.
- `elements`: browser renderer that consumes snapshots produced from JSON bundles.

Deprecate then remove:

- Server-rendered `text/html` app pages.
- `renderHtmlDocument` as the primary app renderer.
- HTML bootstrap as the browser runtime transport.
- HTML `POST -> 303` navigation semantics as a core SDK concern.
- HTML discovery links as part of the core runtime.

## File Map

Core / Bridge:

- Modify: `src/bridge/json-snapshot-adapter.ts`
- Modify: `src/core/types.ts`
- Modify if needed: `src/core/negotiate.ts`

Server:

- Modify: `src/server/runtime.ts`
- Later deprecate/remove: `src/server/html-render.ts`
- Modify: `src/server/index.ts`
- Modify: `src/server/node.ts`
- Modify: `src/server/bun.ts`

Web:

- Create: `src/web/surface-host.ts`
- Modify: `src/web/index.ts`
- Modify: `src/web/protocol.ts`
- Later simplify: `src/web/headless.ts`

Elements:

- Modify if needed: `src/elements/mount.ts`
- Keep: `src/elements/model.ts`

Tests:

- Create: `test/web/surface-host.test.ts`
- Modify: `test/web/public-api.test.ts`
- Modify: `test/server/agent-consumption-contract.test.ts`
- Later remove/replace: `test/server/html-render.test.ts`
- Later remove/replace: `test/server/runtime-html-mode.test.ts`
- Later rewrite HTML-first web tests to JSON-first host tests.

Docs:

- Modify: `README.md`
- Modify: `docs/2026-04-12-agent-consumption-contract.md`
- Modify: `docs/2026-04-11-sdk-feature-backlog.md`

---

## Task 1: Rename The Mental Model

**Files:**
- Modify: `README.md`
- Modify: `docs/2026-04-12-agent-consumption-contract.md`
- Modify: `docs/2026-04-11-sdk-feature-backlog.md`

- [x] **Step 1: Rewrite the contract language**

Use this model:

```text
Source authoring:
  Markdown content + JSON actions

Runtime interaction:
  JSON surface bundle

Readable/debug output:
  Markdown readout

Server HTML:
  legacy/deprecated adapter
```

- [x] **Step 2: Document what bundle means**

Define:

```ts
type SurfaceBundle = {
  content: string;
  actions: ActionsDocument;
  view: SurfaceView;
};
```

Make clear that `content` is Markdown-as-content/prompt, while `actions` is executable truth.

- [x] **Step 3: Verify docs only**

Run:

```bash
rg -n 'Markdown-first|server render|text/html|surface bundle|application/json' README.md docs/2026-04-12-agent-consumption-contract.md docs/2026-04-11-sdk-feature-backlog.md
```

Expected: JSON-first wording is explicit, server HTML is marked legacy/deprecated.

---

## Task 2: Add JSON-First Browser Host

**Files:**
- Create: `src/web/surface-host.ts`
- Modify: `src/web/index.ts`
- Modify: `src/web/protocol.ts`
- Create: `test/web/surface-host.test.ts`
- Modify: `test/web/public-api.test.ts`

- [x] **Step 1: Write failing tests**

Cover:

- `visit()` requests `Accept: application/json`.
- JSON bundle is adapted to a headless snapshot.
- `submit()` requests `Accept: application/json`.
- page response replaces the whole snapshot.
- region response patches `updatedRegions` when safe.
- route change during a region response falls back to page replacement.
- non-2xx JSON surface enters an error state while preserving parseable content.

Run:

```bash
bunx vitest run test/web/surface-host.test.ts test/web/public-api.test.ts
```

Expected: FAIL because `createSurfaceHost` does not exist.

- [x] **Step 2: Implement `createSurfaceHost`**

Implement a new host that has the same public interaction shape as `MdanHeadlessHost` but initializes from JSON rather than HTML bootstrap:

```ts
createSurfaceHost({
  initialSurface?,
  initialRoute?,
  fetchImpl?
})
```

Internally:

- Use `adaptJsonEnvelopeToHeadlessSnapshot()`.
- Use existing submit-body logic or extract shared helpers from `headless.ts`.
- Apply region patch semantics equivalent to current `headless.ts`.
- Push browser history only on safe page transitions.

- [x] **Step 3: Export from web package**

Export `createSurfaceHost` from `src/web/index.ts`.

- [x] **Step 4: Verify**

Run:

```bash
bunx vitest run test/web/surface-host.test.ts test/web/headless-transition.test.ts test/elements/model.test.ts
```

Expected: PASS.

---

## Task 3: Make Elements Work From JSON Host

**Files:**
- Modify: `src/elements/mount.ts`
- Create: `test/elements/surface-host-integration.test.ts`
- Modify: `vitest.baseline.config.ts`
- Test: `test/web/surface-host.test.ts`

- [x] **Step 1: Confirm `mountMdanElements` only needs `MdanHeadlessUiHost`**

Confirmed: `mountMdanElements` consumes only `subscribe/submit/visit/sync` plus optional host lifecycle methods. The JSON-first host can satisfy that contract without exposing source format details to elements.

- [x] **Step 2: Add integration test**

Added `test/elements/surface-host-integration.test.ts` with a DOM test environment. It mounts elements with `createSurfaceHost` and asserts:

- initial Markdown renders
- action fields render from `input_schema`
- submit dispatches through host
- error state renders when host reports error

The test also exposed and fixed a real SDK issue: root detection used `root instanceof Document`, which is brittle across DOM realms and test DOMs. It now uses `nodeType === DOCUMENT_NODE`.

- [x] **Step 3: Verify**

Run:

```bash
bunx vitest run test/elements/surface-host-integration.test.ts test/elements/model.test.ts test/web/surface-host.test.ts
```

Expected: PASS.

---

## Task 4: Move Examples To JSON-First Browser Shell

**Files:**
- Modify: `src/server/adapter-shared.ts`
- Modify: `src/server/bun.ts`
- Modify: `src/server/node.ts`
- Modify: `src/server/index.ts`
- Modify: `examples/*/dev.ts`
- Create: `test/server/browser-shell.test.ts`
- Modify: `test/server/public-api.test.ts`
- Modify: `vitest.baseline.config.ts`
- Modify: `README.md`

- [x] **Step 1: Add a thin browser shell**

Added `renderBrowserShell()` and adapter-level `browserShell` support. Browser-capable examples now opt into a minimal shell that loads the frontend SDK, mounts default elements, creates a JSON `createSurfaceHost()`, and calls `host.sync()`.

- [x] **Step 2: Change browser client requests**

Browser runtime requests should use:

```http
Accept: application/json
```

instead of `text/html`.

The shell path is selected only for browser document navigation. Requests with `Accept: application/json` continue through the runtime and return surface bundles from the same routes.

- [x] **Step 3: Keep Markdown readout tests**

Preserve tests proving:

```http
Accept: text/markdown
```

returns readable content.

`test/server/browser-shell.test.ts` asserts the shell is not served for `text/markdown`, and existing JSON example tests continue to cover readable Markdown output.

- [x] **Step 4: Verify**

Run:

```bash
bunx vitest run test/server/browser-shell.test.ts test/server/auth-guestbook-artifact-example.test.ts test/server/auth-session-json-example.test.ts test/web/surface-host.test.ts
```

Expected: PASS.

---

## Task 4B: Lock Frontend Module Boundaries

**Files:**
- Modify: `src/web/headless.ts`
- Modify: `src/web/surface-host.ts`
- Create: `test/module-boundaries.test.ts`
- Modify: `vitest.baseline.config.ts`
- Modify: `README.md`

- [x] **Step 1: Make `web` imports narrow**

`@mdanai/sdk/web` must stay the lightweight headless runtime. It should import specific core helpers/types instead of the aggregate `core/index` barrel, because the barrel also exports Markdown rendering helpers that are not part of the browser runtime core.

- [x] **Step 2: Add module boundary tests**

Added `test/module-boundaries.test.ts` to reject accidental `web` imports from:

- `elements`
- `lit`
- `core/index`
- `core/markdown-renderer`

The test also verifies the server adapter shell remains a string-level integration point rather than importing the elements implementation.

- [x] **Step 3: Document package layering**

Documented the split:

- `@mdanai/sdk/web`: lightweight JSON surface host/headless runtime
- `@mdanai/sdk/elements`: optional default Web Components UI

---

## Task 4C: Use Local Frontend Modules In Dev

**Files:**
- Modify: `src/server/adapter-shared.ts`
- Modify: `src/server/bun.ts`
- Modify: `src/server/node.ts`
- Modify: `src/server/index.ts`
- Modify: `test/server/browser-shell.test.ts`
- Modify: `test/server/public-api.test.ts`
- Modify: `README.md`

- [x] **Step 1: Write failing tests**

Cover:

- `browserShell.moduleMode = "local-dist"` rewrites shell module URLs to local hosted paths.
- explicit `webModuleSrc` / `elementsModuleSrc` still override local mode.
- Bun host serves `/__mdan/web.js` and `/__mdan/elements.js` from local `dist`.
- if local dist assets are missing, the adapter returns a visible HTML error instead of silently falling back to CDN.

- [x] **Step 2: Add local-dist resolver**

Extend browser shell options with a dev-focused local mode:

```ts
browserShell: {
  title: "MDAN Starter",
  moduleMode: "local-dist"
}
```

Use fixed local paths:

```text
/__mdan/web.js
/__mdan/elements.js
```

- [x] **Step 3: Teach Node/Bun hosts to serve local dist files**

Serve local files before the runtime handler:

- `dist/web/index.js`
- `dist/elements/index.js`

Keep this behavior opt-in through `browserShell.moduleMode`.

- [x] **Step 4: Keep explicit override behavior**

If `webModuleSrc` or `elementsModuleSrc` are explicitly provided, preserve them exactly.

- [x] **Step 5: Verify**

Run:

```bash
bunx vitest run test/server/browser-shell.test.ts test/server/public-api.test.ts
bunx tsc -p tsconfig.json --noEmit
npm run lint
```

Expected: PASS.

---

## Task 5: Deprecate Server HTML

**Files:**
- Modify: `src/server/runtime.ts`
- Modify: `src/server/types.ts`
- Modify: `src/server/index.ts`
- Modify: `README.md`
- Modify tests referencing `text/html`

- [x] **Step 1: Mark HTML APIs deprecated**

Add deprecation docs for:

- `renderHtml`
- `htmlDiscovery`
- `renderHtmlDocument`
- `renderHtmlDiscoveryLinks`
- `injectHtmlDiscoveryLinks`

- [x] **Step 2: Change runtime behavior behind a compatibility option**

Introduce an explicit opt-in flag:

```ts
createMdanServer({
  legacyHtml: true
})

Default runtime behavior now rejects `Accept: text/html` with a 406 Markdown response explaining that HTML mode is disabled unless `legacyHtml: true` is set. Legacy HTML tests and fixtures have been updated to opt in explicitly.
```

Without it, `Accept: text/html` should return `406` or a small deprecation error.

- [x] **Step 3: Update tests**

Move existing HTML tests under legacy coverage or delete when redundant.

Pure HTML compatibility coverage is now grouped behind `bun run test:legacy-html`, while the baseline suite tracks the JSON-first runtime path.

- [x] **Step 4: Verify**

Run:

```bash
bun run test:legacy-html
bunx vitest run --config vitest.baseline.config.ts
```

Expected: PASS.

---

## Task 6: Remove Server HTML Renderer

**Files:**
- Delete: `src/server/html-render.ts`
- Modify: `src/server/runtime.ts`
- Modify: `src/server/index.ts`
- Modify: `src/shared/headless-bootstrap.ts`
- Delete/replace: `test/server/html-render.test.ts`
- Delete/replace: `test/server/runtime-html-mode.test.ts`

- [ ] **Step 1: Remove HTML rendering branch**

Runtime should support only:

- `application/json`
- `text/markdown`
- `text/event-stream` if streaming remains in scope

- [ ] **Step 2: Remove HTML bootstrap parsing from the main web path**

Keep only JSON bundle parsing for interactive browser use.

- [ ] **Step 3: Run full suite**

Run:

```bash
bunx vitest run
bunx tsc -p tsconfig.json --noEmit
npm run lint
```

Expected: PASS.

---

## Exit Criteria

- Agents consume JSON surface bundles without HTML.
- Browser UI consumes JSON surface bundles without server-rendered HTML.
- Markdown readout remains available and tested.
- Server-side HTML rendering is either explicitly legacy or removed.
- Page and region updates work through JSON-first host.
- `elements` remains usable as the default frontend renderer.
