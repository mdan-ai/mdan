---
title: Examples
description: Runnable TypeScript MDAN agent app, skills app, online skills, and interactive Markdown examples for learning the SDK and choosing the right starting point.
---

# Examples

The current repository keeps a small set of runnable TypeScript examples that
show different MDAN application shapes, including agent apps, skills apps, and
online skills exposed through shared Markdown surfaces.

Use this page when you already understand the starter and want to choose the
next agent app or interactive Markdown example that matches what you are trying
to build.

If your mental model is "I want to put a skill online so both humans and agents
can use it," you are still in the right place. That is one of the main MDAN
example shapes.

If you have not run anything yet, start with [Quickstart](/quickstart) first.

If you already ran the starter and want to see what other shapes are possible,
use this page to choose the next example.

## Start Here

Pick the first example by the question you are trying to answer:

- "How small can an MDAN app be?"
  Start with [Starter Example](/examples/starter).
- "How do I build a multi-page docs or content app?"
  Start with [Docs Starter Example](/examples/docs-starter).
- "How do login, registration, and session-aware actions work?"
  Start with [Auth Guestbook Example](/examples/auth-guestbook).
- "Where did the weather demo go?"
  Open [Weather Markdown Demo](/examples/weather-markdown) for the migration pointer.

## Starter Example

Route: [Starter Example](/examples/starter)

Choose this when you want the smallest possible end-to-end MDAN app.

Best for:

- Markdown as the canonical readable surface
- a declared action contract
- browser HTML projection from the same underlying state

What you learn:

- how one page is defined
- how an action is declared and handled
- how the same app appears in HTML and Markdown

Read this first if you are still learning the core model.

## Docs Starter Example

Route: [Docs Starter Example](/examples/docs-starter)

Choose this when you want a docs-style or content-heavy MDAN app instead of a
single starter page.

Best for:

- multi-page Markdown content
- simple page navigation
- docs or knowledge-base shaped apps

What you learn:

- how multiple Markdown files map into one app
- how a docs-style reading flow can stay Markdown-first
- how lightweight read actions fit into a content app

Read this after the starter if your product looks more like docs, guides, or
structured content than like a single interactive page.

## Auth Guestbook Example

Route: [Auth Guestbook Example](/examples/auth-guestbook)

Choose this when you need a real multi-page flow with auth and user state.

Best for:

- login
- registration
- authenticated session state
- guestbook posting flow

What you learn:

- how page flow changes once a session exists
- how form-style actions work in a more realistic app
- how to organize a small but non-trivial MDAN app

Read this after the starter if you are building anything user-aware or
account-based.

## Weather Markdown Demo

Route: [Weather Markdown Demo](/examples/weather-markdown)

This is no longer an active SDK example.

Use it only if you are looking for the weather app that used to live in this
repository.

Active project path:
`/Users/hencoo/projects/mdan/mdan-weather-app`

## Suggested Reading Order

1. [Starter Example](/examples/starter)
2. [Docs Starter Example](/examples/docs-starter) if you care about docs-style apps
3. [Auth Guestbook Example](/examples/auth-guestbook) if you care about sessions and auth

You do not need to read every example. Pick the one that is closest to the app
shape you want to build.

## Related Docs

- [Online Skills](/online-skills)
- [Customize The Starter](/customize-the-starter)
