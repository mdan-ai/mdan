---
title: Changelog
description: Release notes and notable changes for the current MDAN TypeScript SDK package.
---

# Changelog

All notable changes to this package should be documented in this file.

The format is intentionally lightweight and based on Keep a Changelog style:

- `Added` for new features or new documentation sets
- `Changed` for behavior, compatibility, or positioning updates
- `Fixed` for bug fixes and regressions
- `Deprecated` for supported-but-discouraged paths
- `Removed` for deleted behavior

## Unreleased

### Added

- Added `CONTRIBUTING.md` with repository layout, command reference, and doc update expectations.
- Added `ARCHITECTURE.md` describing public package surfaces, layer boundaries, and the Markdown-first runtime model.
- Added a dedicated `spec/` tree for standard-layer protocol documents.
- Added `docs/index.md`, `docs/quickstart.md`, and `docs/examples.md` as docs-site entry pages.
- Added a dedicated `docs-site/` directory for rendering current repository docs and specs as a developer docs site.

### Changed

- Updated `README.md` to link maintainers to the contributing guide, architecture guide, parity notes, and spec entry points.
- Updated `docs/PARITY-CHECK.md` to reflect the current Markdown-first runtime and current regression evidence.
- Moved spec-oriented content out of `docs/` and into `spec/`.

## 0.7.1 - 2026-04-22

### Added

- Added `page.bind(...)` to the app API so stateful pages can be registered and returned without repeating raw `render(state)` calls everywhere.
- Added `spec/state-and-identity.md` and `spec/representations.md` to make the protocol layer more self-contained.
- Added docs-site/spec coverage checks for the narrowed public guidance and renamed spec routes.

### Changed

- Package version is `0.7.1`.
- Root app authoring now centers `page`, `route`, `action`, and `page.bind(...)`, and the starter/template/examples have been synchronized to that path.
- The default browser shell path now uses an internal browser-shell client bundle instead of depending on a public `@mdanai/sdk/ui` product surface.
- The server barrel has been tightened further so low-level Markdown assembly helpers, standalone asset-store helpers, and lower-level internal typing details are no longer part of the main public runtime surface.
- The spec tree has been rewritten around `surface` / `action surface` terminology, with older Markdown-response and `JSON surface envelope` framing removed from the active spec and public docs.

### Removed

- Removed the public `@mdanai/sdk/ui` export from the package surface.
- Removed `route(path, config)` from the app API so page definition and route binding stay separate.

## 0.7.0 - 2026-04-21

### Changed

- Package version is `0.7.0`.
- Public package exports are documented as:
  `@mdanai/sdk/server`,
  `@mdanai/sdk/server/node`,
  `@mdanai/sdk/server/bun`,
  `@mdanai/sdk/surface`,
  `@mdanai/sdk/ui`.
- The repository and docs position the SDK around a Markdown-first runtime where Markdown is the canonical read path and HTML is the browser projection.

### Deprecated

- Legacy JSON surface behavior remains a compatibility path and is no longer the recommended primary contract for new application guidance.
