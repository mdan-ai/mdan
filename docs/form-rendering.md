---
title: Form Rendering
description: Customize the default browser-shell form UI while keeping MDAN actions, route state, and host behavior unchanged.
---

# Form Rendering

Use this page when you want to keep the default browser shell but replace the
shipped form panel with your own UI.

This is the smallest path that still keeps:

- declared MDAN actions
- server-rendered HTML projection
- browser-side runtime takeover
- normal `visit`, `sync`, and `submit` behavior

If you want to replace the entire page UI, use [Custom Rendering](/custom-rendering)
instead.

## The Working Shape

The form-rendering path is now a single declaration:

1. define one `UiFormRenderer` with `defineFormRenderer(...)`
2. pass it once through `createApp({ rendering: { form } })`

From there the default browser shell automatically uses the same renderer for:

- server-side projection
- browser-side runtime takeover

You do not need a custom `uiModuleSrc` just to keep form rendering aligned.

## The Example To Follow

See the runnable example here:

- [examples/form-customization/app.ts](/Users/hencoo/projects/mdan/sdk/examples/form-customization/app.ts)
- [examples/form-customization/form-renderer.js](/Users/hencoo/projects/mdan/sdk/examples/form-customization/form-renderer.js)
- [examples/form-customization/dev.ts](/Users/hencoo/projects/mdan/sdk/examples/form-customization/dev.ts)

It renders a weather query panel from the same declared `GET` action, but with
custom panel markup instead of the default shell form.

## Step 1: Author The Page Normally

Keep the page contract explicit:

- `app/index.md`
- `app/index.action.json`

Your form renderer changes presentation, not the action manifest.

## Step 2: Define A Shared Form Renderer

Export one renderer object that implements both render paths:

```ts
import { defineFormRenderer, html } from "@mdanai/sdk/form-renderer";

export const weatherFormRenderer = defineFormRenderer(import.meta.url, "weatherFormRenderer", {
  renderSnapshotOperation(operation) {
    return `<section data-weather-form>${operation.label}</section>`;
  },
  renderMountedOperation({ operation, onSubmit }) {
    return html`
      <section data-weather-form>
        <button @click=${() => onSubmit(operation)}>${operation.label}</button>
      </section>
    `;
  }
});
```

In a real renderer you usually map `operation.fields` into your own layout and
wire field changes through `onInput(formKey, name, value)`.

`defineFormRenderer(...)` matters because it gives the default browser shell a
browser-loadable module identity for the same renderer. That is how one
declaration now works on both server and browser.

Keep that renderer module browser-loadable:

- prefer a plain `.js` module, or a build output that the browser can import
- avoid Node-only imports in the renderer module itself

## Step 3: Use It In `createApp(...)`

Pass the renderer into app authoring so browser-shell HTML projection uses it:

```ts
import { createApp } from "@mdanai/sdk";
import { weatherFormRenderer } from "./form-renderer.js";

const app = createApp({
  appId: "weather",
  rendering: {
    form: weatherFormRenderer
  }
});
```

This affects the server-rendered browser shell HTML.
The same renderer is also recovered automatically by the default browser shell
once browser-side JavaScript takes over. No app bridge module is needed.

## Step 4: Keep Host Setup Normal

The host stays on the default browser shell path:

```ts
const host = createHost(server, {
  browserShell: {
    title: "Weather"
  }
});
```

You are still using the normal MDAN browser runtime. You are only swapping the
form renderer.

## What The Renderer Gets

The renderer works from `UiOperationView`, which already contains:

- action label
- method and target
- hidden fields such as `action.proof`
- resolved field list
- per-field control semantics like `select`, `checkbox`, `textarea`, `file`

That means your custom form UI does not need to reinterpret raw surface actions.

## Practical Rules

- keep the renderer focused on presentation
- do not invent a second action contract
- submit through `onSubmit(operation)`
- update fields through `onInput(formKey, name, value)`
- let MDAN keep transport, proof handling, and route updates
- reach for `uiModuleSrc` only when you want to replace the whole browser UI
  runtime, not when you only want custom form presentation

## Related Docs

- [Examples](/examples)
- [Custom Rendering](/custom-rendering)
- [Browser Behavior](/browser-behavior)
- [API Reference](/api-reference)
