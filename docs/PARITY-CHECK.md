# Baseline Parity Check (tssdk vs json-bridge)

## Confirmed aligned

- Route-first navigation still works (returned route -> browser history path).
- GET/POST semantics preserved in runtime/router.
- Session mutation semantics preserved (`sign-in`, `refresh`, `sign-out`).
- Page reads still project to HTML for browser-facing hosts.
- HTML discovery links are now runtime-configurable (`alternate markdown` / `llms.txt`).
- Markdown and HTML content negotiation behavior preserved.
- Multi-session isolation preserved in runtime regression.

## Intentional differences

- Runtime now has a single server entrypoint (`createMdanServer()`).
- Artifact-native page and action results are now supported directly.
- `text/markdown` is the preferred public read contract.
- `application/json` remains a legacy compatibility path, not the preferred primary contract.
- `auth-guestbook` is the single canonical auth example flow in this SDK workspace.

## Regression evidence

- `test/server/runtime-json-contract-mode.test.ts`
- `test/server/auth-guestbook-artifact-example.test.ts`
- `test/server/result-content-type-session.test.ts`
- `test/server/response.test.ts`
- `test/web/headless.test.ts`
