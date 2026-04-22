---
title: MDAN Action Proof
description: Normative contract for action-proof protected execution in MDAN action flows.
---

# MDAN Action Proof

- Status: Draft
- Version: vNext

## 1. Scope

This document defines the normative contract for MDAN action proof as an
execution guard.

It covers:

- the security role of action proof
- when proof is required
- the interoperable request shape
- confirmation semantics
- minimum proof-bound claims

It does not define:

- a specific signing algorithm
- a specific token encoding
- a full authentication or authorization model

## 2. Security Role

Action proof is a server-issued capability that proves an action request follows
an action previously issued by the surface.

Action proof:

- is not a page-read token
- is not a session token
- is not a substitute for authorization

Its normative role is to bind action execution to the current declared action
contract.

## 3. Separation Of Reads And Execution

MDAN separates page reads from action execution.

Conforming implementations:

- MUST allow initial page reads without action proof
- MUST require action proof for protected action execution unless proofing is
  explicitly disabled by deployment policy
- MUST treat action proof as an execution guard, not as a replacement for
  business authorization

## 4. Issuance

When action proof is enabled:

- executable actions SHOULD carry `action_proof`
- the proof MUST be bound to the issued action contract

At minimum, proof-bound claims SHOULD cover:

- action identity
- HTTP method
- target path
- declared input names
- input schema
- issue time
- expiration time
- confirmation requirement

Implementations MAY bind proof to more context, such as:

- `app_id`
- `state_id`
- `state_version`
- route
- block identity
- subject or session scope

## 5. Request Shape

The interoperable JSON action request shape is:

```json
{
  "action": {
    "proof": "<server-issued action proof>"
  },
  "input": {
    "field": "value"
  }
}
```

Alternative flat submission forms MAY be used by compatible transports:

```text
action.proof=<server-issued action proof>
field=value
```

## 6. Confirmation

Some actions require explicit confirmation.

When confirmation is required, the interoperable JSON request shape is:

```json
{
  "action": {
    "proof": "<server-issued action proof>",
    "confirmed": true
  },
  "input": {}
}
```

Conforming implementations:

- MUST reject a protected action that requires confirmation when confirmation is
  absent
- MUST bind confirmation requirement to the issued action contract

## 7. Validation Requirements

When proof is enabled, a conforming implementation MUST reject action
execution if:

- proof is absent
- proof does not verify
- method or target does not match the issued action
- submitted input shape violates the proof-bound action contract
- confirmation requirements are not satisfied

## 8. Auto Dependencies

Server-internal auto resolution is not an action-proof bypass.

If an implementation supports auto dependency resolution:

- auto execution MUST remain limited to server-internal safe reads
- external action execution MUST still require action proof when proof is
  enabled

## 9. What Action Proof Does Not Replace

Action proof does not replace:

- authentication
- session checks
- authorization
- business validation
- replay protections outside the proof model
- state-conflict handling

Conforming implementations MUST continue to apply those controls separately.

## 10. Disablement

A deployment MAY explicitly disable action proof.

When proof is disabled:

- the implementation MAY omit `action_proof` from action metadata
- the implementation MUST NOT claim proof-backed execution guarantees

Disablement is implementation-specific and not the normative default for
protected execution.
