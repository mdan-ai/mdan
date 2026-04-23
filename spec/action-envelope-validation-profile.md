---
title: MDAN Action Envelope Validation Profile
description: Markdown-first runtime profile for strict actions contract envelope validation and compatibility expectations.
---

# MDAN Action Envelope Validation Profile

- Status: Draft
- Version: vNext

## 1. Scope

This document defines a concrete validation profile for actions contract
envelope handling in Markdown-first interactive runtimes.

It provides strict requirements that narrow optionality from base specs for
interoperable runtime behavior.

## 2. Profile Intent

Base specification documents may use `SHOULD` on selected identity/security
fields to preserve broader compatibility.

This profile defines stricter runtime behavior for interactive surfaces where
deterministic execution and state tracking are required.

## 3. Envelope Requirements (Profile)

In this profile, `actions` envelope MUST satisfy:

- `app_id` is present, non-empty string
- `state_id` is present, non-empty string
- `state_version` is present, finite number
- `actions` is present and is an array
- every action has non-empty `id`
- every action has non-empty `target`
- action `id` is unique within envelope

If `allowed_next_actions` is present:

- it MUST be an array of strings
- every value MUST reference an existing action `id`

## 4. Enum Constraints (Profile)

When present, profile-conforming runtime validation MUST enforce:

- `verb` in `{route, read, write}`
- `transport.method` in `{GET, POST}`
- `state_effect.response_mode` in `{page, region}`
- `security.confirmation_policy` in `{never, always, high-and-above}`
- `actions.security.default_confirmation_policy` in `{never, always, high-and-above}`

## 5. Input Schema Constraints (Profile)

When `input_schema` is present, runtime validation MUST enforce:

- it is an object
- `required` is an array of strings when present
- `properties` is an object when present

Input-schema value-level validation is defined in
[Input And Input Schema](/spec/input-and-schema).

## 6. Failure Behavior

If envelope validation fails under this profile:

- runtime MUST reject execution for the invalid contract
- runtime MUST emit explicit validation errors suitable for diagnostics
- runtime MUST NOT silently coerce invalid contract-level enum values

## 7. Relation To Base Specs

This profile is an implementation profile layered on:

- [Application Surface Spec](/spec/application-surface)
- [Action Execution](/spec/action-execution)
- [Actions JSON Field Reference](/spec/action-json-fields)

If profile and base guidance differ, profile rules apply only to implementations
claiming this runtime profile.

## 8. Conformance Statement

An implementation claiming this profile MUST explicitly declare:

- that it follows Markdown-first action envelope validation profile
- supported transport method set (currently `GET`/`POST`)
- any profile extensions beyond the base required set
