---
title: MDAN Spec Overview
description: Specification entry point for the MDAN protocol and application-surface contracts.
---

# MDAN Spec Overview

This section defines protocol and standards material.

It is the normative source for MDAN object semantics, execution constraints,
representation rules, and interoperability boundaries.

## How To Read This Section

Think of the spec in three layers:

- core spec
  the pages most readers should start with
- supporting spec
  narrower documents that define specific sub-models or detail fields
- profiles and conformance
  stricter or more deployment-facing constraints

## Core Spec

These are the main normative entry points:

- [Application Surface Spec](/spec/application-surface)
- [Surface Contract](/spec/surface-contract)
- [Action Execution](/spec/action-execution)
- [Action Proof](/spec/action-proof)
- [Error Model And Status Codes](/spec/error-model)

If you only read a small subset of the spec first, read those five.

## Supporting Spec

These documents define important supporting semantics:

- [Actions JSON Field Reference](/spec/action-json-fields)
- [Input And Input Schema](/spec/input-and-schema)
- [Agent Content](/spec/agent-content)
- [State And Identity](/spec/state-and-identity)
- [Representations](/spec/representations)
- [Representation Negotiation](/spec/representation-negotiation)
- [Region Update Semantics](/spec/region-update-semantics)

These are still normative, but they are usually easier to read after the core
spec pages above.

## Profiles And Conformance

- [Action Envelope Validation Profile](/spec/action-envelope-validation-profile)
- [Versioning And Conformance](/spec/versioning-and-conformance)

Use these when you need stricter profile claims or compatibility/conformance
guidance.

## Recommended Reading Order

1. Read the application surface spec for the broader model and terminology.
2. Read surface contract, action execution, action proof, and error model for
   the main interaction contract.
3. Read input/schema, action JSON fields, and agent content when you need field,
   content, and validation detail.
4. Read state/identity plus representations/negotiation/region semantics when
   you need stable multi-representation behavior.
5. Read validation profile and versioning/conformance for stricter compatibility
   and claim boundaries.

## Scope

The `spec/` tree should contain only standard-layer material:

- protocol terminology
- content and action models
- state and identity rules
- surface and compatibility contracts
- representation and negotiation rules
- versioning and interoperability rules
