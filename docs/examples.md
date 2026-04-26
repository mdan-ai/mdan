---
title: Examples
description: Runnable MDAN examples for learning the markdown-first server contract and the optional frontend consumption paths.
---

# Examples

Pick the example that matches the app shape you want to build.

The same surface shape can be used by Web Skills that choose MDAN as their
runtime profile, but these examples are primarily SDK runtime examples.

## Start Here

- Smallest app:
  [Starter Example](/examples/starter)
- Multi-page docs/content:
  [Docs Starter Example](/examples/docs-starter)
- Sessions and auth:
  [Auth Guestbook Example](/examples/auth-guestbook)
- Frontend form rendering primitives:
  [Form Customization Example](/examples/form-customization)

## What Changed

All examples now share the same transport rule:

- the server returns `text/markdown`
- executable action/state data is embedded in that markdown
- browser UI starts from the natural route such as `/login`
- the raw Markdown route stays available as `/login.md`

## Suggested Reading Order

1. [Starter Example](/examples/starter)
2. [Docs Starter Example](/examples/docs-starter)
3. [Auth Guestbook Example](/examples/auth-guestbook)
4. [Form Customization Example](/examples/form-customization)

## Related Docs

- [Web Skills Relationship](/web-skills)
- [Customize The Starter](/customize-the-starter)
- [Form Rendering](/form-rendering)
- [Custom Rendering](/custom-rendering)
