---
title: Third-Party Markdown Renderer
description: Inject a third-party Markdown renderer through the shared markdownRenderer interface.
---

# Third-Party Markdown Renderer

If you do not want to use the built-in Markdown rendering behavior, you can inject your own renderer through `markdownRenderer`.

In most cases, the best approach is to pass the same renderer to both:

- `@mdanai/sdk/server`
- `@mdanai/sdk/elements`

That keeps the server-rendered HTML and the default UI aligned.

Typical use cases include integrating `marked` or reusing the Markdown rendering rules you already have in your application.
