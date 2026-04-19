# create-mdan Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `create-mdan` scaffold package inside the current SDK repository, aligned with the current `@mdanai/sdk` public API.

**Architecture:** The package owns CLI parsing, scaffold file copying, and starter templates. Generated projects depend only on public SDK entrypoints: `@mdanai/sdk/server`, `@mdanai/sdk/server/node`, and `@mdanai/sdk/server/bun`.

**Tech Stack:** TypeScript, Node ESM, Vitest, npm package `bin` metadata.

---

### Task 1: Package Skeleton

**Files:**
- Create: `create-mdan/package.json`
- Create: `create-mdan/tsconfig.json`
- Create: `create-mdan/README.md`

- [ ] Add publish metadata, CLI `bin`, build script, and package `files`.
- [ ] Add TypeScript config extending the repo base config.
- [ ] Document npm and Bun usage.

### Task 2: CLI And Scaffold Core

**Files:**
- Create: `create-mdan/src/scaffold.ts`
- Create: `create-mdan/src/cli.ts`
- Create: `create-mdan/src/cli-bin.ts`
- Test: `create-mdan/test/cli.test.ts`
- Test: `create-mdan/test/scaffold.test.ts`

- [ ] Write tests for runtime detection, argument parsing, SDK version range derivation, and invalid args.
- [ ] Write tests for generated package files and rejection of non-empty target directories.
- [ ] Implement template copying and placeholder replacement.

### Task 3: New SDK Starter Templates

**Files:**
- Create: `create-mdan/template/shared/app/index.md`
- Create: `create-mdan/template/shared/app/actions/main.json`
- Create: `create-mdan/template/shared/app/server.mjs`
- Create: `create-mdan/template/node/index.mjs`
- Create: `create-mdan/template/node/package.json`
- Create: `create-mdan/template/node/README.md`
- Create: `create-mdan/template/bun/index.mjs`
- Create: `create-mdan/template/bun/package.json`
- Create: `create-mdan/template/bun/README.md`

- [ ] Base the generated app on current JSON-first starter behavior.
- [ ] Ensure templates do not reference removed SDK entrypoints.
- [ ] Keep generated projects runnable without a TypeScript build step.

### Task 4: Repo Integration

**Files:**
- Modify: `package.json`
- Modify: `vitest.baseline.config.ts`
- Modify: `eslint.config.mjs`
- Modify: `test/package-scripts.test.ts`

- [ ] Add root scripts for building and testing `create-mdan`.
- [ ] Include `create-mdan` tests in the baseline.
- [ ] Include `create-mdan` source and tests in lint.
- [ ] Update script assertions.

### Task 5: Verification

- [ ] Run `bunx vitest run create-mdan/test/cli.test.ts create-mdan/test/scaffold.test.ts`.
- [ ] Run `npm run build:create-mdan`.
- [ ] Run `npm run lint`.
- [ ] Run `bun run test:baseline`.
- [ ] Run `npm_config_cache=/tmp/mdan-npm-cache npm pack --dry-run --json` in `create-mdan/`.
