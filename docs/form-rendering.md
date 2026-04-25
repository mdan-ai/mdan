---
title: Form Rendering
description: Customize frontend form rendering with `@mdanai/sdk/frontend` while keeping MDAN transport and surface behavior unchanged.
---

# Form Rendering

Use this page when you want to customize form presentation in the shipped
frontend layer.

The server still only returns markdown. Form rendering lives entirely in the
frontend package.

This means the current flow is:

1. the browser opens a natural route such as `/login`
2. the frontend entry fetches the matching raw markdown route such as `/login.md`
3. the shipped frontend renders forms through your `frontend.form`

## What This Package Gives You

From `@mdanai/sdk/frontend` you get:

- `createFrontend(...)`
- `defineFormRenderer(...)`
- `frontend.render(...)`
- `frontend.mount(...)`
- `UiFormRenderer`

That means you can keep MDAN transport, proof handling, route updates, and
surface semantics while changing only the panel markup.

## Basic Shape

```ts
import { createFrontend, defineFrontendModule, defineFormRenderer, html } from "@mdanai/sdk/frontend";

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

export const weatherFrontend = defineFrontendModule(
  import.meta.url,
  createFrontend({
    form: weatherFormRenderer
  })
);
```

You then use that object as the frontend entry, not as a server callback:

- `weatherFrontend.render(view)`
- `weatherFrontend.mount({ root, host })`
- `weatherFrontend.boot(...)`

If you use the shipped browser entry, that still happens entirely in the
frontend layer. The server never receives a form-rendering callback.

## Practical Rule

- keep the renderer focused on presentation
- do not invent a second action contract
- let MDAN keep transport, proof handling, and route updates

## Related Docs

- [Choose A Rendering Path](/choose-a-rendering-path)
- [Markdown Rendering](/markdown-rendering)
- [Custom Rendering](/custom-rendering)
- [Browser Behavior](/browser-behavior)
- [API Reference](/api-reference)
