---
title: SDK Reference
description: Public entry points and capability map for @mdsnai/sdk.
---

# SDK Reference

`@mdsnai/sdk` is published as one package with subpath exports.

## Entry Points

- `@mdsnai/sdk`
- `@mdsnai/sdk/core`
- `@mdsnai/sdk/server`
- `@mdsnai/sdk/web`
- `@mdsnai/sdk/elements`

## Capability Map

- `core`: parse/validate/serialize/body helpers/negotiation
- `server`: hosted app runtime, node host bridge, action/session helpers
- `web`: browser headless runtime and snapshot lifecycle
- `elements`: official web-components UI over headless runtime

## See Also

- [SDK Overview](/docs/sdk)
- [API Reference](/docs/api-reference)
- [Server Runtime](/docs/server-runtime)
- [Web Runtime](/docs/web-runtime)
- [Elements](/docs/elements)

## Import Guidance

- Prefer subpath imports for clear boundaries (`@mdsnai/sdk/server`, etc.).
- Use root import when you explicitly want a single import surface.
- Avoid importing deep internal files under `dist/*` directly.

## Compatibility Notes

- Current line: single package with subpath exports.
- Legacy multi-package names are not public entry points in current release docs.
