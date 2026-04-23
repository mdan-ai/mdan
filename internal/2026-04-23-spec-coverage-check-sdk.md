# SDK -> Spec Coverage Check (2026-04-23)

## Goal

Validate whether protocol-facing SDK capabilities are documented in `spec/`, and
separate them from SDK-only authoring/runtime APIs.

## Scope Reviewed

- `src/protocol/*`
- protocol-relevant serialization behavior in `src/content/serialize.ts`
- current spec set under `spec/`

## Coverage Summary

### A) Protocol-facing fields already covered in spec

- Action core: `id`, `target`, `label`, `verb`, `transport.method`
- Action execution controls: `allowed_next_actions`, `state_effect.*`
- Security: `security.confirmation_policy`, action proof fields
- Input contract: `input_schema` shape, validation and normalization boundaries
- Identity: `app_id`, `state_id`, `state_version`, `route`
- Content semantics: semantic slots, `agent:begin/agent:end`, block contracts

### B) Newly aligned in this pass

- `ActionsContract.regions` documented in `spec/action-json-fields.md`
- `ActionObject.block` documented in `spec/action-json-fields.md`

### C) Intentionally NOT spec material (SDK/runtime layer)

- `createApp`, `actions.*`, `fields.*`, `app.bindActions(...)`
- request helpers: `getHeader`, `getCookie`, `getQueryParam`
- host adapters and runtime wiring (`server/node`, `server/bun`, browser shell)
- app-level ergonomics such as `page.actionJson()` convenience output
- legacy headless/bootstrap operation shape (`blocks[].operations`, `accept`,
  `submitFormat`, etc.) used as compatibility/runtime projection internals

These belong to SDK docs, not protocol spec.

## Residual Gaps / Follow-up Candidates

1. Keep `spec/action-json-fields.md` and `src/protocol/surface.ts` in lockstep
   whenever action contract fields change.
2. Add a lightweight CI check later:
   - detect protocol type field changes
   - require a matching spec/doc update in the same PR.

## Decision Boundary

- `spec/` remains protocol-only, normative, implementation-agnostic.
- SDK API ergonomics and framework-facing usage remain in `docs/` (not `spec/`).
