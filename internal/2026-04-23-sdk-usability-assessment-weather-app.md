---
title: SDK Usability Assessment (Weather App)
description: Practical evaluation of @mdanai/sdk API ergonomics based on the standalone weather app implementation.
---

# SDK Usability Assessment (Weather App)

This document evaluates `@mdanai/sdk` from real usage in
`mdan-weather-app`.

Scope:

- app-authoring API (`createApp`, `app.page`, `app.route`, `app.action`)
- action declaration API (`actions.read`)
- Bun host integration (`createHost`)

Date: 2026-04-23

## Executive Summary

`@mdanai/sdk` is strong on the core path:

- It is easy to stand up a real app with page + action + route primitives.
- Runtime hosting is straightforward for Bun.
- Markdown-first output and browser shell integration are practical.

Main friction is not capability coverage, but authoring ergonomics in advanced
or medium-complex apps:

- input/schema authoring is more manual than expected
- handler input typing is too loose for safe refactoring
- route/action composition has a few API shape mismatches

Overall judgment:

- Completeness for current weather app: **8/10**
- Ergonomics for sustained product work: **6.5/10**

## APIs Used In Weather App

### App Construction

- `createApp(...)`
- options used: `appId`, `actionProof`, `browserShell`, `rendering.markdown`

Observed behavior:

- clean initialization with a single entrypoint
- custom markdown renderer integration is clear

### Page + Action Declarations

- `app.page(path, config)` for `/` and `/event`
- `actions.read(id, options)` for declared read contracts
- `app.route(...)` for path handlers
- `app.action(...)` for action submission paths

Observed behavior:

- supports both declarative page definitions and custom route handlers
- easy to combine canonical page contracts with custom runtime logic

### Host Adapter

- `createHost(server, { browserShell })`
- used directly with `Bun.serve`

Observed behavior:

- low ceremony
- cookies/body normalization and browser-form bridging work out of the box

## Strengths

1. Clear mental model for app authors

- `page` for declarative surface
- `route` for request-driven logic
- `action` for mutation/query execution

2. Good interoperability between human and agent surfaces

- same route can serve markdown and browser HTML shell
- same app contracts are consumable by agents

3. Good starter-to-production continuity

- API used in examples scales to real weather app without major rewrites

4. Bun adapter is practical

- production-like local runtime requires very little glue code

## Gaps And Frictions

### 1) Schema ergonomics are too manual (High)

Current public helpers only provide:

- `fields.string`
- `fields.number`
- `fields.boolean`

In real use, authors need frequent manual schema objects for:

- enum values
- date/date-time formats
- arrays
- nested objects
- numeric bounds and string patterns

Impact:

- noisy action definitions
- repeated ad hoc schema snippets
- higher drift between intent and declared validation

### 2) Handler inputs are weakly typed (High)

`inputs` in action handlers is a generic map shape and often requires casts in
app code.

Impact:

- refactors are less safe
- easier to ship subtle bugs from string/number coercion
- repetitive parsing boilerplate in every action handler

### 3) Route/action API composition is slightly uneven (Medium)

`app.action(path, handler)` always registers POST internally, while action
metadata still allows transport method configuration.

Impact:

- API surface can feel inconsistent to authors
- read-style actions often still need parallel GET route handling

### 4) Request typing strictness hurts direct test ergonomics (Low/Medium)

`MdanRequest.cookies` is required in type shape.

Impact:

- hand-written tests need extra boilerplate
- type friction is higher than runtime semantics in simple tests

## Is The SDK “Complete Enough” For This App?

Yes.

For the weather app's current feature set (root weather flow, event endpoints,
health endpoint, custom markdown renderer), the SDK is functionally complete.

No critical functionality is missing for shipping and operating this app.

## Is The SDK “Nice Enough” For Ongoing Iteration?

Partially.

Main development velocity drag is type/schema ergonomics, not runtime
capability.

For teams shipping many action surfaces or evolving input contracts often,
current ergonomics will accumulate cost.

## Recommended Improvements

### P0 (next minor release)

1. Expand `fields` builder surface

- add `fields.enum([...])`
- add `fields.date()` / `fields.datetime()`
- add `fields.array(itemField)`
- add `fields.object({...})`
- add optional constraints (min/max, pattern, minLength/maxLength)

2. Add typed input inference for actions

- infer handler input types from declared `input` schema in `app.page`/actions
- expose helper utilities for typed extraction and coercion

3. Improve docs with a “Typed Actions” guide

- practical before/after examples
- avoid forcing manual `as Record<string, unknown>` patterns

### P1 (near-term)

1. Align action transport and route registration semantics

- either support method-aware action registration in `app.action`
- or document strict POST model with clearer warnings in API reference

2. Add testing helper for request factories

- e.g. `createTestRequest({ method, url, headers, body })`
- auto-default `cookies: {}` and common headers

3. Add API patterns for “markdown result surface” responses

- helper factory for frequent `markdown + actions metadata` envelope
- reduce repeated hand-built result surface utilities in app code

## Suggested Success Metrics

Track over two releases:

1. Average lines needed to declare one action input contract
2. Number of explicit casts in official examples
3. Number of docs snippets requiring raw schema object literals
4. Developer feedback on action typing confidence

Target direction:

- less manual schema JSON
- fewer unsafe casts
- shorter and clearer action handler implementations

## Decision

Keep current architecture and runtime model.

Invest in authoring ergonomics (schema builders + typed inputs) as the top
priority.

This will improve usability significantly without destabilizing the runtime
contract.
