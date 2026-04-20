# Test Baseline Layout

## Directories

- `test/`: current active tests.
  - Full tree currently has `54` test files / `316` cases.
  - Stable executable baseline: `47` files / `302` cases (via `vitest.baseline.config.ts`).

## Scripts

- `bun run test` or `bun run test:baseline`: run stable baseline suite.
- `bun run test:coverage`: run baseline with enforced coverage gates (`lines 75`, `branches 65`, `functions 75`).
- `bun run test:json`: run minimal legacy JSON bridge regression subset.
- `bun run test:tssdk-migrated`: run the full `test/` tree.
