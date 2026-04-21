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

- [Application Surface Spec (ZH)](/spec/application-surface-zh)
- [Legacy Surface And Actions Contract](/spec/legacy-surface-actions-contract)

## Reading Order

1. Read the application surface spec for the broader model.
2. Read the legacy surface contract if you need compatibility behavior for older
   JSON bridge consumers.
3. Use the runtime and server documents in `/docs` for current SDK behavior and
   host implementation details.

## Scope

The `spec/` tree should contain only standard-layer material:

- protocol terminology
- content and action models
- surface and compatibility contracts
- versioning and interoperability rules

Implementation-specific guides stay in `docs/`.
