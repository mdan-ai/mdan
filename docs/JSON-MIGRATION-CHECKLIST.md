# JSON Migration Checklist (tssdk Baseline)

Goal: keep tssdk runtime/web/elements flow unchanged, replace legacy app contract with JSON contract.

## Principles
- Keep browser lifecycle unchanged: `createHeadlessHost -> mount -> subscribe -> submit/visit`.
- Keep route-first navigation semantics unchanged.
- Keep default UI lifecycle unchanged.
- Replace only contract/data source surfaces first.

## Phase 0: Baseline Freeze
- [x] Copy tssdk sdk package into `baseline-tssdk-json/`.
- [x] Make baseline workspace self-contained (`tsconfig.base.json`) and buildable.
- [ ] Add local verification scripts for this workspace.
- [ ] Record baseline behavior snapshots (auth-guestbook flow).

## Phase 1: JSON Contract Adapter (No behavior change)
- [x] Add a JSON snapshot adapter module to map `{content, actions, view}` into headless snapshot shape.
- [ ] Keep `web/headless.ts` public API untouched.
- [ ] Keep `elements/mount.ts` untouched.
- [x] Add adapter unit tests.

## Phase 2: Server Bridge
- [x] Add server runtime bridge that can serve current JSON envelope routes.
- [ ] Keep route/page rendering path and `transformHtml` model.
- [x] Preserve `GET/POST` operation semantics for browser host.

## Phase 3: Example Migration
- [x] Migrate auth-guestbook first.
- [x] Ensure multi-session isolation (session provider) in regression tests.
- [x] Verify flow: register -> login -> post -> logout.

## Phase 4: Cutover
- [x] Remove temporary fallback path from primary example flow.
- [x] Remove temporary compatibility mode entrypoints.
- [x] Final parity check against tssdk behavior matrix.
