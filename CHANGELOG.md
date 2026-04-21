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
- Added `ARCHITECTURE.md` describing public package surfaces, layer boundaries, and the artifact-first runtime model.
- Added a dedicated `spec/` tree for standard-layer protocol documents.
- Added `docs/index.md`, `docs/getting-started.md`, and `docs/examples.md` as docs-site entry pages.
- Added a dedicated `docs-site/` directory for rendering current repository docs and specs as a developer docs site.

### Changed

- Updated `README.md` to link maintainers to the contributing guide, architecture guide, parity notes, and spec entry points.
- Updated `docs/PARITY-CHECK.md` to reflect the current artifact-first runtime and current regression evidence.
- Moved spec-oriented content out of `docs/` and into `spec/`.

## 0.7.0 - 2026-04-21

### Changed

- Package version is `0.7.0`.
- Public package exports are documented as:
  `@mdanai/sdk/server`,
  `@mdanai/sdk/server/node`,
  `@mdanai/sdk/server/bun`,
  `@mdanai/sdk/surface`,
  `@mdanai/sdk/ui`.
- The repository and docs position the SDK around an artifact-first runtime where Markdown is the canonical read path and HTML is the browser projection.

### Deprecated

- Legacy JSON surface behavior remains a compatibility path and is no longer the recommended primary contract for new application guidance.
