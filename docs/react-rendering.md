---
title: Custom Rendering with React
description: Use @mdanai/sdk/web as the runtime while React owns the UI.
---

# Custom Rendering with React

This page is kept for old links. The main content now lives in [Custom Rendering](/docs/custom-rendering).

If you only care about the React version, go straight to:

- [Custom Rendering](/docs/custom-rendering)
- [examples/react-starter/app/client.tsx](/Users/hencoo/projects/mdsn/examples/react-starter/app/client.tsx)

The key React-specific difference is simple: you will usually use `useEffect` to manage host creation, subscription, and cleanup, then project runtime state into component state.

## Related Docs

- [Web Runtime](/docs/web-runtime)
- [Examples](/docs/examples)
- [Custom Rendering](/docs/custom-rendering)
