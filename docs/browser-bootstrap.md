---
title: Browser Bootstrap
description: Use browser bootstrap for first browser entry initialization without changing agent-facing markdown semantics or hand-authoring transport details.
---

# Browser Bootstrap

Use this page when your question is:

- how to run browser-only initialization on first load
- how browser bootstrap differs from auto dependencies
- how to migrate browser-first dynamic auto flows

## What Browser Bootstrap Is

Browser bootstrap is the SDK path for browser-only, first-entry initialization.

Use it when:

- a human browser opens the app
- the behavior should not affect agent-facing markdown reads
- initialization depends on browser-only experience or browser-specific state

Typical cases:

- location-based initialization
- login or session recovery
- permission-gated onboarding
- restoring browser-specific local state

## The Key Difference From Auto

Use `auto` for dependency resolution inside the surface graph.

Use browser bootstrap for first browser entry initialization.

That means:

- static auto remains the default for normal internal GET dependencies
- dynamic auto remains available for advanced runtime-computed GET overrides
- browser bootstrap is the right path for first browser load behavior

## SDK-Owned Intent Bridge

The frontend entry now attaches an internal SDK-owned bootstrap intent marker to
its first browser-driven read.

Runtime recognizes that marker automatically and routes the request through the
browser bootstrap hook when one is declared.

App code does not need to:

- invent custom headers
- inspect frontend entry internals
- manually distinguish browser entry from agent markdown reads

## App API

Declare browser bootstrap at the app layer:

```ts
import { createApp } from "@mdanai/sdk";

const app = createApp({
  browser: {
    async bootstrap({ request, session }) {
      const url = new URL(request.url);
      const location = url.searchParams.get("location");

      if (!location) {
        return null;
      }

      return {
        page: {
          frontmatter: {},
          markdown: `# Weather for ${location}`,
          blocks: []
        }
      };
    }
  }
});
```

The hook runs only for the first browser entry read. A normal markdown request
from an agent or CLI does not trigger it.

## What The Hook Can Return

Browser bootstrap returns normal SDK result shapes:

- a page result
- a fragment result
- `null` to fall back to the normal page handler

Guidance:

- return a page when bootstrap decides the whole initial route state
- return a fragment when bootstrap only needs to populate or replace one region

Bootstrap stays inside the normal page/fragment surface model. It does not
introduce a second rendering system.

## Migration Guidance

If you previously used dynamic auto for browser-first initialization, move that
logic here when the behavior is truly browser-only.

Good migration examples:

- location-based initialization
  move browser geolocation or first-load location routing into browser bootstrap
- login recovery
  run session restoration or login-state recovery in bootstrap, not dynamic auto
- browser permission gating
  run first-load permission-sensitive guidance in bootstrap, not in a general
  auto dependency resolver

Keep dynamic auto for cases where the app still needs a normal runtime GET
dependency and only the request construction is dynamic.

## Related Docs

- [Auto Dependencies](/auto-dependencies)
- [Browser Behavior](/browser-behavior)
- [API Reference](/api-reference)
