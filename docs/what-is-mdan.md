---
title: What is MDAN?
description: Learn what MDAN is, how markdown carries both readable content and executable state, and how server/runtime and frontend stay decoupled.
---

# What is MDAN?

One interactive markdown surface for humans and agents.

MDAN is a markdown-first application model where a response stays:

- readable to humans
- executable by agents
- consumable by frontends

from the same server output.

## In One Sentence

MDAN lets you build one app surface that the server returns as markdown while
agents and frontends consume the same embedded action/state contract.

## Core Model

The canonical wire representation is markdown.

That markdown carries:

- the readable body
- block anchors
- embedded executable action/state data

So the server does not need to negotiate a separate HTML view. Frontends can
consume the markdown surface directly and project it however they want.

## How The SDK Fits

- `@mdanai/sdk/app`
  app authoring
- `@mdanai/sdk/server`
  lower-level server runtime
- `@mdanai/sdk/core`
  shared protocol/content layer
- `@mdanai/sdk/server/node` and `@mdanai/sdk/server/bun`
  host the markdown-first runtime
- `@mdanai/sdk/frontend`
  shipped frontend helpers
- `@mdanai/sdk/surface`
  custom-frontend runtime

## Why This Model Matters

- content and interaction stay close together
- agents do not need a separate guessed JSON workflow
- frontends do not need a separate server HTML mode
- the same surface can keep driving the next step

This makes MDAN a useful runtime profile for [Web Skills](/web-skills), but
Web Skills themselves are a separate authoring and publishing specification.

## Where To Start Next

1. [Quickstart](/quickstart)
2. [Customize The Starter](/customize-the-starter)
3. [Examples](/examples)
4. [Web Skills Relationship](/web-skills)
