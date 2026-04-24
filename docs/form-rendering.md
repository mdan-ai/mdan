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
- browser-side hydration
- normal `visit`, `sync`, and `submit` behavior

If you want to replace the entire page UI, use [Custom Rendering](/custom-rendering)
instead.

## The Working Shape

The current end-to-end path has two pieces:

1. a shared `UiFormRenderer`
2. a custom browser `uiModuleSrc` that mounts the default UI runtime with that renderer

The reason for the second step is simple: browser hydration needs a browser-side
module. The server cannot serialize your renderer functions into HTML.

So the full path is:

- server-side projection: `createApp({ rendering: { form } })`
- browser-side hydration: custom `uiModuleSrc` that passes the same renderer to
  `mountMdanUi(...)`

## The Example To Follow

See the runnable example here:

- [examples/form-customization/app.ts](/Users/hencoo/projects/mdan/sdk/examples/form-customization/app.ts)
- [examples/form-customization/form-renderer.js](/Users/hencoo/projects/mdan/sdk/examples/form-customization/form-renderer.js)
- [examples/form-customization/browser-ui.js](/Users/hencoo/projects/mdan/sdk/examples/form-customization/browser-ui.js)
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
import { html } from "lit";
import type { UiFormRenderer } from "@mdanai/sdk";

export const weatherFormRenderer: UiFormRenderer = {
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
};
```

In a real renderer you usually map `operation.fields` into your own layout and
wire field changes through `onInput(formKey, name, value)`.

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

## Step 4: Use The Same Renderer In The Browser UI Module

Create a small browser module that wraps `mountMdanUi(...)`:

```js
import { mountMdanUi as baseMountMdanUi } from "/__mdan/ui.js";
import { weatherFormRenderer } from "/form-renderer.js";

export function mountMdanUi(options) {
  return baseMountMdanUi({
    ...options,
    formRenderer: weatherFormRenderer
  });
}
```

This keeps hydration on the same custom panel markup instead of falling back to
the default shell form.

## Step 5: Point The Browser Shell At That Module

Configure the host so the browser shell imports your UI wrapper:

```ts
const host = createHost(server, {
  browserShell: {
    title: "Weather",
    surfaceModuleSrc: "/__mdan/surface.js",
    uiModuleSrc: "/browser-ui.js"
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

## Related Docs

- [Examples](/examples)
- [Custom Rendering](/custom-rendering)
- [Browser Behavior](/browser-behavior)
- [API Reference](/api-reference)
