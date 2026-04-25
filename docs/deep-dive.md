---
title: Deep Dive
description: Continue from the starter into real MDAN development: core content and action concepts first, then custom server or custom rendering paths when you need them.
---

# Deep Dive

Use this section when the starter already makes sense and you are beginning to
build a real MDAN app.

These pages are the next layer after onboarding.

Read them in two stages:

- first learn the core MDAN concepts that show up in almost every app
- then choose a customization path only if your app really needs it

## Stage 1: Core Concepts

1. [Semantic Slots](/semantic-slots)
2. [Action JSON](/action-json)
3. [Input Schemas](/input-schemas)

That order mirrors the real development flow:

- first you structure the readable Markdown surface
- then you define and inspect the explicit action contract carried by
  `app/index.action.json`
- then you understand how action inputs are declared and validated

If you only read three pages in this section, read those three first.

## Stage 2: Customization Paths

Only continue into these pages when the default starter path is no longer
enough:

4. [Custom Server](/custom-server)
5. [Custom Rendering](/custom-rendering)

Use `Custom Server` when you want to control how MDAN attaches to Node or Bun.

Use `Custom Rendering` when you want to replace the shipped browser UI but keep
MDAN browser behavior.

These two guides are related, but they solve different problems:

- `Custom Server` is about HTTP integration
- `Custom Rendering` is about browser presentation

You can use either one independently, or both together.

## What Each Page Helps You Do

### Semantic Slots

Use this when you are writing or reviewing MDAN page content.

It explains:

- how shared page structure should be written
- how region-level content differs from page-level content
- how agent-only guidance stays separate from human-visible content

### Action JSON

Use this when you need to see the actual action contract instead of only the
high-level App API declarations.

It explains:

- why explicit action manifests now live next to page Markdown
- what `page.actionJson()` really returns
- how that manifest connects to runtime handlers in `app.ts`
- what fields matter during debugging and integration

### Input Schemas

Use this when you are declaring action inputs or trying to understand why a
request failed validation.

It explains:

- how `fields.*(...)` declarations map into JSON Schema
- what the runtime validates
- what common request-shape mistakes lead to `400` errors

### Custom Server

Use this when the default host wiring is no longer the right fit.

It explains:

- when to use the high-level host helpers
- when you might need the lower-level runtime listener
- which server responsibilities belong to MDAN versus the host adapter

### Custom Rendering

Use this when the shipped frontend is no longer the right fit.

It explains:

- how to keep MDAN browser behavior while owning your own UI
- what `createHeadlessHost()` is responsible for
- how navigation, action submission, and region updates behave in a custom
  frontend

## Practical Rule

When a developer says one of these things:

- "How should I structure this page?"
  Read [Semantic Slots](/semantic-slots).
- "What is the runtime actually sending?"
  Read [Action JSON](/action-json).
- "Why is this action input rejected?"
  Read [Input Schemas](/input-schemas).
- "I need MDAN to live inside my own server."
  Read [Custom Server](/custom-server).
- "I need my own frontend, not the shipped browser UI."
  Read [Custom Rendering](/custom-rendering).

## Related Docs

- [Customize The Starter](/customize-the-starter)
- [Troubleshooting](/troubleshooting)
- [API Reference](/api-reference)
- [Spec Overview](/spec)
