---
title: Glossary
description: Quick definitions for the core MDAN terms used across the docs and spec.
---

# Glossary

This page gives the shortest practical definitions for the core MDAN terms.

For normative wording, use the `spec/` pages. This glossary is the fast
developer-facing version.

## Application Surface

The overall MDAN model for a state-bound interactive surface shared across
readable content, actions, identity, and representations.

See [Application Surface Spec](/spec/application-surface).

## Surface

A state-bound interactive surface that combines readable content, executable
actions, and identity.

See [Surface Contract](/spec/surface-contract).

## Markdown Response

In the current Markdown-first profile, the primary readable representation
returned to clients. It is typically a Markdown document plus an embedded
`mdan` block.

## Representation

A deliverable form of the same underlying surface, such as Markdown or HTML.

See [Representations](/spec/representations).

## Projection

A derived representation of the same underlying surface state. In current docs,
HTML is the browser projection of the Markdown-first surface.

## Content Document

The readable Markdown content that humans and agents consume. It may contain
blocks, semantic slots, and agent-only sections, but it is not the full
executable truth by itself.

## Actions Contract

The executable contract for the current state: action list, input constraints,
state effects, and allowed next actions.

## Action

A declared next operation that a client or agent may execute from the current
surface.

See [Action Execution](/spec/action-execution).

## Allowed Next Actions

The allow-list of action ids that are executable from the current state. If
present, clients should not execute actions outside it.

## State

The identity boundary of the app at a point in time.

See [State And Identity](/spec/state-and-identity).

## `app_id`

The application namespace that issued the current surface.

## `state_id`

The logical identity of the current state instance.

## `state_version`

The revision of the current state instance.

## Route

The route-level location associated with the current surface. It is not the
same thing as state identity.

## Region

A named part of a surface that may be updated independently from the whole
page.

## State Effect

The declared outcome shape of an action, such as `page` or `region`.

## Action Proof

A server-issued execution guard that binds action execution to a previously
issued action contract.

See [Action Proof](/spec/action-proof).

## Semantic Slots

Optional structured headings like `Purpose`, `Context`, `Rules`, and `Result` that help
stabilize shared readable content.

See [Agent Content](/spec/agent-content).

## Agent Blocks

Agent-only Markdown content embedded in comment markers such as
`agent:begin` / `agent:end`. These are not meant to appear in human-visible
projections.

## Browser Entry

The thin browser-facing HTML entry that boots frontend code, then fetches the
markdown surface for the requested route.

See [Browser Behavior](/browser-behavior).

## Headless Host

The browser-side runtime in `@mdanai/sdk/surface` that handles continuation,
transport, navigation, and action submission without owning the visual layer.

## Default UI

The shipped SDK browser UI implementation. It is useful for default browser
flows, but it is not the main public extension boundary.
