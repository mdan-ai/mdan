---
title: Custom Rendering
description: Build your own browser UI on top of `@mdanai/sdk/surface`, while keeping MDAN route state, action submission, and region update behavior.
---

# Custom Rendering

Use this page when you want to keep MDAN behavior but replace the shipped
browser UI with your own frontend.

This is the right path when:

- you want your own React, Vue, or other component tree
- you still want MDAN to own route state and action submission
- you do not want to re-implement the browser/runtime contract yourself

If you just want the fastest shipped frontend path, stay on the default
frontend helpers.

If you only want to customize Markdown or form projection inside the shipped
frontend, use the frontend rendering hooks instead:

- [Choose A Rendering Path](/choose-a-rendering-path)
- [Markdown Rendering](/markdown-rendering)
- [Form Rendering](/form-rendering)

If you want the shipped frontend entry, use the natural browser route and let
it fetch matching markdown surfaces from the server.

## What You Keep And What You Replace

With custom rendering:

- `@mdanai/sdk/surface` keeps transport, route state, action submission, and
  region update behavior
- your UI layer renders the current snapshot and owns local visual state

In short:

- MDAN still owns application behavior
- your frontend owns presentation

## When To Choose This Path

Choose custom rendering when:

- the shipped default UI is not the presentation you want
- you need your own design system
- you want to connect MDAN behavior to an existing frontend app

Do not choose it just because you want to tweak styles or Markdown rendering.
That is a much smaller customization problem.

## The Main Entry Point

Import the headless browser runtime:

```ts
import { createHeadlessHost } from "@mdanai/sdk/surface";
```

The host gives you the main browser-side behavior:

- `mount()`
- `unmount()`
- `subscribe(listener)`
- `getSnapshot()`
- `visit(target)`
- `sync(target?)`
- `submit(operation, values)`

If you are building reusable frontend code, you can type it against the
frontend contracts from `@mdanai/sdk/frontend` and accept any compatible host,
instead of depending on the concrete surface runtime types directly.

## The Basic Lifecycle

The recommended pattern is:

1. create the host once
2. subscribe to snapshot updates
3. mount the host
4. call `sync()` for the first load when needed
5. unmount and unsubscribe during teardown

Example:

```ts
import { createHeadlessHost } from "@mdanai/sdk/surface";

const host = createHeadlessHost({
  initialRoute: window.location.pathname + window.location.search,
  fetchImpl: window.fetch
});

const unsubscribe = host.subscribe((snapshot) => {
  console.log(snapshot.status, snapshot.route);
});

host.mount();
await host.sync();

// later
unsubscribe();
host.unmount();
```

The important rule is: create one long-lived host for the current UI tree, not
one host per component render.

## What Your UI Renders

Your rendering layer should derive UI from the current snapshot:

- `snapshot.markdown`
- `snapshot.blocks`
- `snapshot.route`
- `snapshot.status`
- `snapshot.error`

That means your UI reacts to MDAN state instead of duplicating server
assumptions in frontend state machines.

## Navigation And Actions

Use `visit(target)` for route-style navigation.

Use `submit(operation, values)` for declared actions.

Practical rules:

- submit only fields declared by the current operation
- let GET actions stay query-driven
- let POST actions submit declared input values
- react to returned page or region updates instead of predicting them locally

## Files And Form Data

If a submitted value is a `File`, the headless host automatically switches to
multipart form data and includes `action.proof` as a form field when needed.

If there is no file, POST actions are submitted as JSON.

That means your UI usually does not need separate transport logic for ordinary
vs file-backed action submission.

## Region Updates

When an action declares `state_effect.response_mode: "region"`, the headless
host will try to patch targeted regions. If the operation declares
`updated_regions`, those names are the targets. If it does not, the submitted
action's mounted block is the default target.

If the returned route changes, or the expected region is missing, the host
falls back to a page replacement.

Your UI should be ready for either outcome.

## Error Handling

Non-2xx responses move the host into `error` status.

If the server returns readable Markdown, the host still adapts that content so
your UI can render a useful error surface instead of only showing a transport
failure.

Use `snapshot.status` and `snapshot.error` as the main error-state signals.

## Debugging

Enable debug messages during development:

```ts
const host = createHeadlessHost({
  initialRoute: window.location.pathname + window.location.search,
  debugMessages: true
});
```

Debug records are stored in:

```ts
window.__MDAN_DEBUG__.messages
```

This is useful when you need to inspect the actual request/response flow while
building a custom UI.

## Practical Rule

When building a custom frontend:

- do not invent a parallel action model
- do not hardcode expected page transitions
- do not submit undeclared input fields
- do let the headless host own MDAN behavior
- do let your framework own presentation

That split is what keeps a custom frontend aligned with the same runtime
contract as the default browser path.

## Related Docs

- [Choose A Rendering Path](/choose-a-rendering-path)
- [Custom Server](/custom-server)
- [Markdown Rendering](/markdown-rendering)
- [Form Rendering](/form-rendering)
- [Browser Behavior](/browser-behavior)
- [SDK Packages](/sdk-packages)
- [API Reference](/api-reference)
- [Examples](/examples)
