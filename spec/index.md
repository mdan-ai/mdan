---
title: MDAN Spec Overview
description: Specification entry point for the MDAN protocol and application-surface contracts.
---

# MDAN Spec Overview

This section defines protocol and standards material.

It is the normative source for MDAN object semantics, execution constraints,
representation rules, and interoperability boundaries.

## Current Spec Set

- [Application Surface Spec](/spec/application-surface)
- [Surface Contract](/spec/surface-contract)
- [Action Execution](/spec/action-execution)
- [Action Envelope Validation Profile](/spec/action-envelope-validation-profile)
- [Actions JSON Field Reference](/spec/action-json-fields)
- [Input And Input Schema](/spec/input-and-schema)
- [Action Proof](/spec/action-proof)
- [Agent Content](/spec/agent-content)
- [State And Identity](/spec/state-and-identity)
- [Representations](/spec/representations)
- [Representation Negotiation](/spec/representation-negotiation)
- [Region Update Semantics](/spec/region-update-semantics)
- [Versioning And Conformance](/spec/versioning-and-conformance)

## Reading Order

1. Read the application surface spec for the broader model and terminology.
2. Read action execution, actions JSON fields, input/schema, and action proof
   for executable semantics and safety boundaries.
3. Read state and identity, surface contract, region update semantics, and
   representations/negotiation for stable multi-representation behavior.
4. Read action envelope validation profile for stricter runtime profile claims.
5. Read the versioning and conformance spec for compatibility and claim
   boundaries.

## Scope

The `spec/` tree should contain only standard-layer material:

- protocol terminology
- content and action models
- state and identity rules
- surface and compatibility contracts
- representation and negotiation rules
- versioning and interoperability rules
