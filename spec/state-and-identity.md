---
title: MDAN State And Identity
description: Normative contract for state identity, route identity, and state transition semantics in MDAN.
---

# MDAN State And Identity

- Status: Draft
- Version: vNext

## 1. Scope

This document defines the normative identity model for MDAN surfaces.

It covers:

- application identity
- state identity
- state versioning
- route identity
- identity consistency across representations and transitions

It does not define:

- a specific storage model
- a specific session model
- a specific transport adapter
- a specific implementation strategy for version generation

## 2. Identity Fields

The stable interoperable identity fields are:

- `app_id`
- `state_id`
- `state_version`
- `route`

These fields do not all carry the same semantics.

## 3. Application Identity

`app_id` identifies the application namespace that issued the surface.

Conforming producers:

- MUST treat `app_id` as an application-level identity
- MUST NOT reuse the same `app_id` for unrelated application protocols within
  the same conformance scope

Conforming consumers:

- MUST treat `app_id` as a namespace boundary, not as a full state identifier

## 4. State Identity

`state_id` identifies a logical state instance.

`state_version` identifies a specific version of that logical state instance.

Together:

- `state_id` distinguishes one logical state from another
- `state_version` distinguishes one revision of the same logical state from
  another

Conforming implementations:

- MUST NOT silently merge surfaces whose `state_id` values conflict
- MUST treat a changed `state_id` as a state-instance transition
- SHOULD treat a changed `state_version` under the same `state_id` as a state
  revision

## 5. Route Identity

`route` identifies the route-level location associated with the current
 surface.

`route`:

- MAY remain stable across multiple state revisions
- MAY change when navigation or a state transition moves the consumer to a new
  route
- MUST NOT be interpreted as replacing `state_id`

Conforming consumers:

- MUST treat `route` as route identity, not as the sole executable identity of
  the surface

## 6. Identity Consistency

When a single surface is represented in multiple forms, its identity fields
MUST remain semantically aligned.

If two representations describe the same surface state:

- `app_id` MUST remain aligned
- `state_id` MUST remain aligned
- `state_version` MUST remain aligned
- `route`, when present in both, MUST remain aligned

Identity fields MAY be omitted by a reduced-capability representation, but an
omitted field MUST NOT be contradicted by another field in the same state.

## 7. Identity Across Transitions

After action execution, a resulting surface MAY:

- preserve `route` and preserve state identity
- preserve `route` and advance `state_version`
- preserve `app_id` and change `state_id`
- change both route identity and state identity

What matters normatively is that the resulting identity fields describe the
resulting state truthfully.

Producers MUST NOT:

- report an unchanged state identity for a semantically different state unless
  that is explicitly the same state
- report a route transition without aligning the resulting surface semantics

## 8. Consumer Requirements

A conforming consumer:

- MUST preserve identity context across page reads and action execution
- MUST use declared identity fields when correlating subsequent surfaces
- MUST NOT infer identity solely from route strings, labels, or readable body
  text

## 9. Missing Identity Fields

Some representations MAY omit one or more identity fields.

When identity fields are omitted:

- the surface MAY still be readable
- the surface MAY be treated as reduced-capability
- consumers MUST NOT invent conflicting identity values

Interactive profiles SHOULD include stable identity fields whenever practical.
