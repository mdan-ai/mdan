---
title: MDAN Versioning And Conformance
description: Normative contract for versioning, compatibility, conformance claims, and profile boundaries in MDAN.
---

# MDAN Versioning And Conformance

- Status: Draft
- Version: vNext

## 1. Scope

This document defines the normative rules for:

- conformance claims
- compatibility expectations
- profile boundaries
- versioning guidance for interoperable evolution

It does not define:

- a package manager versioning policy for any SDK
- a release cadence for any implementation
- a requirement that every implementation ship every optional profile

## 2. Conformance

An implementation claims MDAN conformance only for the parts of the
specification it actually satisfies.

A conforming implementation:

- MUST satisfy all normative requirements of each spec document it claims to
  implement
- MUST NOT claim conformance if it knowingly contradicts stable MDAN object,
  identity, representation, or safety semantics
- MUST distinguish clearly between core conformance and profile-specific
  behavior

## 3. Profiles

A profile is a constrained, named set of behavior within the broader MDAN
specification.

Profiles MAY define:

- preferred public representations
- stricter validation behavior
- optional safety requirements
- compatibility transports

Profiles MUST NOT redefine the core semantic meaning of:

- surface identity
- action identity
- allowed-next-action semantics
- state-effect semantics
- trust and confirmation semantics

## 4. Markdown-First Profile

The current primary profile represented by this repository is a Markdown-first
profile.

Its stable expectations are:

- Markdown is the primary public read representation
- HTML is a projection of the same surface for browser-facing consumption
- compatibility transports MAY exist, but are not the primary public contract

## 5. Compatibility

Compatibility means that multiple implementations or versions can exchange MDAN
surfaces without changing the underlying semantic truth.

A compatible change:

- MAY add optional fields
- MAY add optional profile features
- MAY add new documentation or stricter guidance

A potentially breaking change:

- removes a previously stable required field
- changes the semantic meaning of an existing stable field
- changes allow-list behavior for `allowed_next_actions`
- changes state identity interpretation
- changes the required relation between readable surface and executable truth

## 6. Legacy And Archived Material

Legacy transports or archived documents MAY remain available as historical or
compatibility references.

However:

- they MUST NOT be presented as the current primary contract
- they MUST be clearly labeled as legacy, archived, or compatibility-only
- they MUST NOT override the current primary spec set

## 7. Stable Semantic Areas

The following areas are stable semantic boundaries for compatibility purposes:

- application identity
- state identity and state versioning
- route identity
- action identity and target semantics
- page versus region outcome semantics
- action-proof protected execution semantics
- shared readable content versus agent-only content boundaries
- cross-representation consistency

## 8. Versioning Guidance

When evolving the specification:

- semantic clarification without changing behavior SHOULD be treated as
  non-breaking
- additive optional fields SHOULD be treated as compatible
- changes to stable semantic interpretation SHOULD be treated as versioned
  compatibility events

Implementations SHOULD document:

- which MDAN spec set or draft revision they target
- which optional profiles they support
- which compatibility transports they continue to expose

## 9. Conformance Statements

A useful conformance statement SHOULD identify:

- the spec documents implemented
- the supported profile or profiles
- any known omitted optional capabilities
- any compatibility-only or legacy transports still exposed

Example:

```text
Conforms to: application-surface, surface-contract, action-execution,
action-proof, agent-content, state-and-identity, representations,
versioning-and-conformance
Profile: Markdown-first
Compatibility: legacy JSON bridge not exposed publicly
```
