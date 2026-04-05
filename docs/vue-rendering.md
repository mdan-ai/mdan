---
title: Custom Rendering with Vue
description: Use @mdanai/sdk/web as the runtime while Vue owns the UI.
---

# Custom Rendering with Vue

This page is kept for old links. The main content now lives in [Custom Rendering](/docs/custom-rendering).

If you only care about the Vue version, go straight to:

- [Custom Rendering](/docs/custom-rendering)
- [examples/vue-starter/app/client.ts](/Users/hencoo/projects/mdsn/examples/vue-starter/app/client.ts)

The key Vue-specific difference is simple: you will usually manage host creation, subscription, and teardown in the component lifecycle, then map runtime state into the component tree.

## Related Docs

- [Web Runtime](/docs/web-runtime)
- [Examples](/docs/examples)
- [Custom Rendering](/docs/custom-rendering)
