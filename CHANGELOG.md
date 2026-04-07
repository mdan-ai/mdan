# Changelog

All notable changes to this project will be documented in this file.

This changelog starts at `0.4.0`. Earlier releases were not backfilled.

## 0.6.0 - 2026-04-07

### Breaking

- `@mdanai/sdk@0.6.0` is the major syntax transition release for the current MDAN line
- the new MDAN syntax is now the default syntax across the main SDK surface
- legacy syntax support has been removed from the mainline SDK surface
- existing apps that still depend on the legacy syntax need to migrate before upgrading to `0.6.0`

### Changed

- core syntax modules and exports have been aligned to their canonical names without `v2` suffixes
- public examples, starter templates, docs, and mainline tests now use the current syntax by default
- `create-mdan@0.6.0` now generates apps against the `^0.6.0` SDK line
- direct-write request semantics are now documented around shared named input fields across `text/markdown`, `application/x-www-form-urlencoded`, and `multipart/form-data`

## 0.5.0 - 2026-04-05

### Changed

- `@mdanai/sdk@0.5.0` is the first SDK release published fully under the MDAN name
- `create-mdan@0.5.0` is the first starter release published fully under the MDAN name
- the repository, docs, protocol identifiers, runtime symbols, and examples have been renamed from `MDSN/mdsn` to `MDAN/mdan`
- the `0.5.x` starter line now generates `@mdanai/sdk: ^0.5.0`

## SDK 0.4.3 - 2026-04-03

### Fixed

- Root-mounted static files now resolve correctly from top-level paths in both the Node and Bun host adapters
- Host adapter coverage now includes regression tests for top-level static file serving

## 0.4.5 - 2026-04-02

### Changed

- `@mdanai/sdk` is now published as `0.4.2`, adding explicit `auto` operations that are resolved by the server host before returning the final result
- `auto` resolution now stays consistent across agent and browser consumers, and `label` no longer carries implicit execution behavior
- `create-mdan` is now published as `0.4.5` and continues to generate `@mdanai/sdk: ^0.4.0` for the current `0.4.x` starter line
- `create-mdan` no longer pins `@mdanai/sdk` as its own direct runtime dependency

## 0.4.4 - 2026-04-02

### Changed

- Published `create-mdan` metadata is being refreshed in a standalone patch release so npm package-page behavior can be verified independently of SDK changes

## 0.4.3 - 2026-04-01

### Changed

- `create-mdan` now pins generated apps to the compatible `@mdanai/sdk` minor series instead of writing `latest`
- `0.4.x` starters now generate `@mdanai/sdk: ^0.4.0`

## 0.4.2 - 2026-04-01

### Fixed

- `create-mdan` now executes correctly when package managers launch the published bin through a symlinked entrypoint
- Published CLI execution now uses a dedicated bin entry instead of relying on fragile main-module detection

## 0.4.1 - 2026-04-01

### Fixed

- `create-mdan` now starts correctly when invoked through `bunx`
- Published Bun scaffold verification now covers the registry-installed starter path

## 0.4.0 - 2026-04-01

### Added

- Official Node and Bun runtime support for the MDAN SDK
- New runtime adapter entrypoints: `@mdanai/sdk/server/node` and `@mdanai/sdk/server/bun`
- A Bun-native host adapter with dedicated SDK coverage
- Runtime-aware starter scaffolding in `create-mdan`
- Node and Bun release smoke coverage
- Root-level license source with per-package prepack syncing

### Changed

- `create-mdan` now scaffolds either a Node or Bun starter
- `bunx create-mdan` defaults to the Bun starter
- `npm create mdan@latest` and `npx create-mdan` default to the Node starter
- SDK documentation now describes the shared server runtime separately from runtime-specific host adapters
- In-repo examples now import the explicit Node host adapter from `@mdanai/sdk/server/node`

### Fixed

- CLI runtime override parsing now supports npm's `--` argument separator
- Published `create-mdan` packages now include the split starter template directories
- Bun smoke execution now propagates the Bun binary path correctly during starter startup
