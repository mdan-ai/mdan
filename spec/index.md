---
title: MDAN Spec Overview
description: Specification entry point for the current MDAN application surface and compatibility contracts.
---

# MDAN Spec Overview

This section is for protocol and standards material, not day-to-day SDK usage
guides.

The goal is to keep specification language distinct from implementation
guidance:

- `docs/` explains how the current TypeScript SDK behaves
- `spec/` defines the protocol and compatibility contracts we want to preserve

## Current Spec Set

- [Artifact Contract](/spec/artifact-contract)
- [Action Execution](/spec/action-execution)
- [Action Proof](/spec/action-proof)
- [Agent Content](/spec/agent-content)
- [Application Surface Spec (ZH)](/spec/application-surface-zh)

## Reading Order

1. Read the artifact, action execution, action proof, and agent content specs
   for the interoperable Markdown-first contract.
2. Read the application surface spec for the broader model and terminology.
3. Use the runtime and server documents in `/docs` for current SDK behavior and
   host implementation details.

## Scope

The `spec/` tree should contain only standard-layer material:

- protocol terminology
- content and action models
- surface and compatibility contracts
- versioning and interoperability rules

Implementation-specific guides stay in `docs/`.
