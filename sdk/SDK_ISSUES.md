# SDK Issues

Date: 2026-04-07

This file tracks SDK-side follow-up work after comparing the MDAN spec against the current TypeScript reference implementation.

## Open Issues

None currently tracked.

## Resolved Issues

### 1. Stream `GET` naming validation mismatch

Status: Resolved

- named stream `GET` operations now validate successfully
- parser and validator behavior are consistent with current grammar usage
- tests were updated to reflect the resolved rule

### 2. Request field validation for page-defined `POST` operations

Status: Resolved

- runtime now supports host-injected `POST` request validation (`validatePostRequest`) on the main request pipeline
- hosted-app uses that runtime hook to validate submitted fields against:
  - block-declared `INPUT`s
  - active `POST ... WITH ...` input list
- invalid fields now return recoverable Markdown `400` responses
- tests cover both runtime hook behavior and hosted-app undeclared/disallowed field paths

### 3. `INPUT asset` multipart normalization format

Status: Resolved (SDK-side standardization)

- multipart file values are now normalized to a host-defined asset reference format:
  - `mdan-asset://<name>?type=<mime>&size=<bytes>`
- Node and Bun adapter tests were updated accordingly

## Notes

- stream `GET` naming is now considered resolved and does not require an SDK change
- zero-input `POST` is now considered valid MDAN and does not require an SDK change
- `INPUT asset` is now considered a host-defined asset reference in MDAN v1
- the spec wording was updated separately in `/Users/hencoo/projects/mdan/spec/spec.md`
