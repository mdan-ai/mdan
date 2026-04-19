# TypeScript Naming Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the SDK with the naming rules in `docs/2026-04-10-typescript-naming-conventions.md` by keeping protocol `snake_case` at the boundary, using internal `camelCase`/`PascalCase`, and normalizing non-compliant file names.

**Architecture:** Keep wire-format names unchanged in contract shapes and serialized payloads, but translate them immediately at adapter/runtime boundaries into internal typed models. After the internal model is normalized, rename legacy files to `kebab-case` and update exports/imports so the codebase has one file-naming style.

**Tech Stack:** TypeScript, Bun/Vitest, ripgrep, existing SDK runtime/core/web/elements modules

---

## File Map

**Boundary and internal model files**
- Modify: `src/bridge/json-snapshot-adapter.ts`
- Modify: `src/core/types.ts`
- Modify: `src/shared/render-semantics.ts`
- Modify: `src/elements/model.ts`
- Modify: `src/web/headless.ts`
- Modify: `src/server/runtime.ts`

**Legacy file-name cleanup**
- Rename: `src/core/actionProof.ts` -> `src/core/action-proof.ts`
- Rename: `src/core/jsonbody.ts` -> `src/core/json-body.ts`
- Rename: `src/core/contentactions.ts` -> `src/core/content-actions.ts`
- Rename: `src/core/inputschema.ts` -> `src/core/input-schema.ts`
- Modify: `src/core/index.ts`
- Modify: `src/server/adapter-shared.ts`

**Tests to update**
- Modify: `test/core/actionProof.test.ts` -> `test/core/action-proof.test.ts`
- Modify: `test/core/jsonbody.test.ts` -> `test/core/json-body.test.ts`
- Modify: `test/core/contentactions.test.ts` -> `test/core/content-actions.test.ts`
- Modify: `test/core/inputschema.test.ts` -> `test/core/input-schema.test.ts`
- Modify: `test/server/runtimeActionProof.test.ts` -> `test/server/runtime-action-proof.test.ts`
- Modify: `test/bridge/json-snapshot-adapter.test.ts`
- Modify: `test/elements/model.test.ts`
- Modify: `test/server/runtime-json-bridge.test.ts`
- Modify: `test/server/runtime-html-mode.test.ts`
- Modify: `test/web/headless-transition.test.ts`

**Optional follow-up automation**
- Modify: `package.json` if a lint/check script is added
- Create: ESLint config only if the repo is ready to adopt it without churn

---

### Task 1: Freeze The Current Naming Baseline

**Files:**
- Reference: `docs/2026-04-10-typescript-naming-conventions.md`
- Reference: `src/bridge/json-snapshot-adapter.ts`
- Reference: `src/core/types.ts`
- Reference: `src/shared/render-semantics.ts`
- Reference: `src/elements/model.ts`
- Reference: `src/web/headless.ts`

- [ ] **Step 1: Confirm the intended boundary rule**

Write down the rule in the task notes:

```text
Protocol payload keys may remain snake_case.
Internal runtime/page/operation fields must be camelCase.
```

- [ ] **Step 2: Record the current boundary leaks**

Capture the current internal reads of protocol-shaped fields:

```bash
rg -n '\.(state_effect|response_mode|updated_regions|allowed_next_actions|input_schema|route_path|confirmation_policy|risk_level|default_confirmation_policy)\b' src
```

Expected: matches in `src/bridge/json-snapshot-adapter.ts`, `src/shared/render-semantics.ts`, `src/elements/model.ts`, `src/web/headless.ts`, `src/server/runtime.ts`, and `src/core/contracts.ts`.

- [ ] **Step 3: Record the current non-kebab file names**

Run:

```bash
rg --files src test | rg '(actionProof|jsonbody|contentactions|inputschema|runtimeActionProof)\.test\.ts$|(actionProof|jsonbody|contentactions|inputschema)\.ts$'
```

Expected: the legacy file set is listed exactly once so the rename scope is explicit before edits begin.

- [ ] **Step 4: Commit the baseline notes if you are executing in a branch**

```bash
git add docs/2026-04-10-typescript-naming-conventions.md
git commit -m "docs: capture naming unification baseline"
```

Skip if there are no content changes yet.

---

### Task 2: Normalize Internal Operation Metadata Names

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/bridge/json-snapshot-adapter.ts`
- Modify: `src/shared/render-semantics.ts`
- Modify: `src/elements/model.ts`
- Modify: `src/web/headless.ts`
- Modify: `src/server/runtime.ts`
- Test: `test/bridge/json-snapshot-adapter.test.ts`
- Test: `test/elements/model.test.ts`
- Test: `test/server/runtime-json-bridge.test.ts`
- Test: `test/web/headless-transition.test.ts`

- [ ] **Step 1: Write or update failing tests for internal camelCase metadata**

Add assertions that internal operations expose camelCase metadata:

```ts
expect(operation.stateEffect?.responseMode).toBe("region");
expect(operation.stateEffect?.updatedRegions).toEqual(["messages"]);
expect(operation.security?.confirmationPolicy).toBe("high-and-above");
expect(operation.guard?.riskLevel).toBe("high");
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run:

```bash
bun test test/bridge/json-snapshot-adapter.test.ts test/elements/model.test.ts test/web/headless-transition.test.ts
```

Expected: failures on missing camelCase properties or stale `snake_case` reads.

- [ ] **Step 3: Extend the internal operation types**

Update `src/core/types.ts` so internal operations can carry typed internal metadata:

```ts
export interface MdanOperationStateEffect {
  responseMode?: "page" | "region";
  updatedRegions?: string[];
}

export interface MdanOperationGuard {
  riskLevel?: string;
}

export interface MdanOperationSecurity {
  confirmationPolicy?: "never" | "always" | "high-and-above";
}
```

Then add optional `stateEffect`, `guard`, `security`, and existing `inputSchema` support to the operation types.

- [ ] **Step 4: Translate protocol keys at the adapter boundary**

In `src/bridge/json-snapshot-adapter.ts`, keep `JsonSurfaceEnvelope` and `JsonAction` as protocol-shaped types, but map them into internal camelCase fields when building `MdanOperation`.

Implementation target:

```ts
const stateEffect = isRecord(action.state_effect)
  ? {
      ...(action.state_effect.response_mode === "page" || action.state_effect.response_mode === "region"
        ? { responseMode: action.state_effect.response_mode }
        : {}),
      ...(Array.isArray(action.state_effect.updated_regions)
        ? { updatedRegions: action.state_effect.updated_regions.filter(isString) }
        : {})
    }
  : undefined;
```

Do the same for `risk_level` -> `riskLevel` and `confirmation_policy` -> `confirmationPolicy`.

- [ ] **Step 5: Replace internal `snake_case` reads with typed camelCase reads**

Update:
- `src/shared/render-semantics.ts`
- `src/elements/model.ts`
- `src/web/headless.ts`
- `src/server/runtime.ts`

Examples:

```ts
const responseMode = operation.stateEffect?.responseMode;
const updatedRegions = operation.stateEffect?.updatedRegions ?? [];
const riskLevel = operation.guard?.riskLevel;
const policy = operation.security?.confirmationPolicy;
```

- [ ] **Step 6: Preserve contract validation on protocol shapes**

Leave `src/core/contracts.ts` on protocol field names because it validates the external contract envelope itself. Do not rename contract-path strings like `actions.allowed_next_actions`.

- [ ] **Step 7: Run the targeted tests to verify they pass**

Run:

```bash
bun test test/bridge/json-snapshot-adapter.test.ts test/elements/model.test.ts test/server/runtime-json-bridge.test.ts test/web/headless-transition.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/core/types.ts src/bridge/json-snapshot-adapter.ts src/shared/render-semantics.ts src/elements/model.ts src/web/headless.ts src/server/runtime.ts test/bridge/json-snapshot-adapter.test.ts test/elements/model.test.ts test/server/runtime-json-bridge.test.ts test/web/headless-transition.test.ts
git commit -m "refactor: normalize internal operation naming"
```

---

### Task 3: Rename Legacy Core Files To Kebab-Case

**Files:**
- Rename: `src/core/actionProof.ts` -> `src/core/action-proof.ts`
- Rename: `src/core/jsonbody.ts` -> `src/core/json-body.ts`
- Rename: `src/core/contentactions.ts` -> `src/core/content-actions.ts`
- Rename: `src/core/inputschema.ts` -> `src/core/input-schema.ts`
- Modify: `src/core/index.ts`
- Modify: `src/core/contracts.ts`
- Modify: `src/server/adapter-shared.ts`
- Test: `test/core/actionProof.test.ts` -> `test/core/action-proof.test.ts`
- Test: `test/core/jsonbody.test.ts` -> `test/core/json-body.test.ts`
- Test: `test/core/contentactions.test.ts` -> `test/core/content-actions.test.ts`
- Test: `test/core/inputschema.test.ts` -> `test/core/input-schema.test.ts`
- Test: `test/server/runtimeActionProof.test.ts` -> `test/server/runtime-action-proof.test.ts`

- [ ] **Step 1: Rename one production file at a time with matching import updates**

Use non-interactive git moves:

```bash
git mv src/core/actionProof.ts src/core/action-proof.ts
git mv src/core/jsonbody.ts src/core/json-body.ts
git mv src/core/contentactions.ts src/core/content-actions.ts
git mv src/core/inputschema.ts src/core/input-schema.ts
```

- [ ] **Step 2: Update barrel exports and imports**

Required updates include:
- `src/core/index.ts`
- `src/core/contracts.ts`
- `src/server/adapter-shared.ts`
- any tests importing old paths

Target style:

```ts
export * from "./action-proof.js";
export * from "./json-body.js";
export * from "./content-actions.js";
export * from "./input-schema.js";
```

- [ ] **Step 3: Rename the matching tests**

```bash
git mv test/core/actionProof.test.ts test/core/action-proof.test.ts
git mv test/core/jsonbody.test.ts test/core/json-body.test.ts
git mv test/core/contentactions.test.ts test/core/content-actions.test.ts
git mv test/core/inputschema.test.ts test/core/input-schema.test.ts
git mv test/server/runtimeActionProof.test.ts test/server/runtime-action-proof.test.ts
```

- [ ] **Step 4: Run the focused tests**

Run:

```bash
bun test test/core/action-proof.test.ts test/core/json-body.test.ts test/core/content-actions.test.ts test/core/input-schema.test.ts test/server/runtime-action-proof.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/index.ts src/core/contracts.ts src/server/adapter-shared.ts src/core/action-proof.ts src/core/json-body.ts src/core/content-actions.ts src/core/input-schema.ts test/core/action-proof.test.ts test/core/json-body.test.ts test/core/content-actions.test.ts test/core/input-schema.test.ts test/server/runtime-action-proof.test.ts
git commit -m "refactor: rename legacy core files to kebab-case"
```

---

### Task 4: Sweep Remaining Test and Example Naming Friction

**Files:**
- Modify: `test/server/runtime-html-mode.test.ts`
- Modify: `test/server/runtime-json-session-isolation.test.ts`
- Modify: `test/server/runtime-json-bridge.test.ts`
- Modify: `examples/*/app.ts`

- [ ] **Step 1: Verify remaining `snake_case` matches are protocol fixtures only**

Run:

```bash
rg -n '\b[a-z]+_[a-z0-9_]+\b' src test examples
```

Expected: remaining matches are overwhelmingly fixture payloads, frontmatter examples, contract-path strings, regexes, and protocol type definitions.

- [ ] **Step 2: Clean internal variable names that still mirror protocol fields**

If any helpers still use names like `route_path` or `allowed_next_actions` as local variables, rename them to `routePath` / `allowedNextActions` while keeping serialized keys unchanged.

- [ ] **Step 3: Run the full test suite**

Run:

```bash
bun test
```

Expected: PASS for the complete suite.

- [ ] **Step 4: Commit**

```bash
git add src test examples
git commit -m "refactor: finish naming consistency sweep"
```

---

### Task 5: Add Guardrails So New Code Stays Consistent

**Files:**
- Modify: `package.json` if scripts are added
- Create or modify: ESLint config only if the repository is ready
- Modify: `docs/2026-04-10-typescript-naming-conventions.md` only if implementation decisions need documentation updates

- [ ] **Step 1: Decide whether linting is in scope for this branch**

If adding ESLint will cause unrelated churn, split it into a dedicated follow-up branch. Do not block the naming cleanup on introducing a linter.

- [ ] **Step 2: If in scope, add a minimal naming rule**

Prefer a narrow rule that protects new code:

```json
"@typescript-eslint/naming-convention": [
  "error",
  { "selector": "default", "format": ["camelCase"], "leadingUnderscore": "allow" },
  { "selector": "typeLike", "format": ["PascalCase"] }
]
```

Document explicit exceptions for env vars and quoted property names.

- [ ] **Step 3: Run the lint/check command**

Run the repo's chosen verification command and capture any exceptions that must stay as-is.

- [ ] **Step 4: Commit**

```bash
git add package.json .eslintrc.* docs/2026-04-10-typescript-naming-conventions.md
git commit -m "chore: add naming guardrails"
```

---

## Notes And Guardrails

- Do not rename external protocol keys in example payloads, frontmatter, contract fixtures, or serialized JSON.
- Do not change public export symbol names unless the public API itself is intentionally being revised.
- Prefer typed internal fields over repeated `(operation as any)` access.
- Keep `UPPER_SNAKE_CASE` constants only where they are true module-level constants, such as `DEFAULT_MAX_BODY_BYTES` or `MDAN_BOOTSTRAP_SCRIPT_ID`.
- Use small commits per task so regressions in runtime behavior are easy to isolate.

## Recommended Execution Order

1. Task 2 first: boundary mapping and internal metadata typing.
2. Task 3 second: file renames once internal reads are stable.
3. Task 4 third: cleanup sweep and full-suite verification.
4. Task 5 last: optional lint guardrails.
