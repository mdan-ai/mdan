---
title: HTTP Content Negotiation
description: Learn how one MDAN app serves both humans and agents from the same page and action definitions.
---

# HTTP Content Negotiation

MDAN uses HTTP content negotiation so the same app can serve both humans and agents from the same page and action definitions.

The core rule is simple:

```http
Accept: text/markdown
```

returns Markdown.

```http
Accept: text/html
```

returns HTML.

## Why This Exists

Agents need Markdown.  
Browsers need HTML.

MDAN does not want two separate application surfaces for that, so it returns the same underlying result in the form each caller needs.

## Typical Requests

When an agent reads a page or invokes an action, it usually sends:

```http
Accept: text/markdown
```

When a browser visits a page or submits an interaction, it usually sends:

```http
Accept: text/html
```

For writes, the app still uses the same underlying field semantics for both agents and browsers.

In practice that means:

- browser hosts commonly use `application/x-www-form-urlencoded`
- file uploads use `multipart/form-data`
- agents and CLI tools often use `text/markdown`

The important point is simple:

- the same app can return Markdown to agents
- the same app can return HTML to browsers

What changes is the returned form, not the application itself.

That is why an agent can talk directly to the same web app with native HTTP tools like `curl`, without needing a headless browser.

## Why This Matters

The biggest value here is that you do not have to split one app into two systems.

- you do not need one interface for agents and a different one for browsers
- you do not need to keep content, interaction, and server behavior in sync across duplicated definitions
- agents and browsers see different forms, but they are still using the same app

That keeps the app simpler and less likely to drift over time.

## Related Docs

- [Understanding MDAN](/docs/understanding-mdan)
- [Application Structure](/docs/application-structure)
- [Server Runtime](/docs/server-runtime)
- [Agent App Demo](/docs/agent-app-demo)
