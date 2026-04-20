# Baseline Parity Check (tssdk vs json-bridge)

## Confirmed aligned

- Route-first navigation still works (`route_path` -> browser history path).
- GET/POST semantics preserved in runtime/router.
- Session mutation semantics preserved (`sign-in`, `refresh`, `sign-out`).
- HTML bootstrap contract preserved for headless/elements (`kind: page|fragment`).
- HTML discovery links are now runtime-configurable (`alternate markdown` / `llms.txt`).
- Markdown and HTML content negotiation behavior preserved.
- Multi-session isolation preserved in runtime regression.

## Intentional differences

- Runtime now has a single server entrypoint (`createMdanServer()`).
- JSON envelope outputs are the only supported handler contract in runtime paths.
- `auth-guestbook` is the single canonical auth example flow in this SDK workspace.

## Regression evidence

- `test/server/runtime-json-bridge.test.ts`
- `test/server/runtime-json-session-isolation.test.ts`
- `test/server/runtime-json-contract-mode.test.ts`
- `test/server/auth-guestbook-artifact-example.test.ts`
- `test/server/runtime-html-mode.test.ts`
