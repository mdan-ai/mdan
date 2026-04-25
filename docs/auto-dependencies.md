---
title: Auto Dependencies
description: How current MDAN auto dependencies work, including static and dynamic auto GET execution, app and server resolver options, and the runtime guardrails that apply today.
---

# Auto Dependencies

Use this page when your question is:

- how `auto: true` actions are actually executed
- how to inject dynamic query/cookie/header/session-derived inputs
- how `options.auto` and `options.autoDependencies` interact

This page describes runtime behavior and SDK authoring patterns for auto
dependencies.

This feature is new and still evolving. Treat this page as a description of the
current implementation, not as a long-settled contract.

## One-Line Model

Auto is a two-track model:

- static auto: declare `auto: true` on a GET action and use its static `target`
- dynamic auto: register `auto.resolveRequest(...)` at app/server level so the
  app decides how the internal GET request is built

Runtime is the executor, not the decision maker.

## Why Dynamic Auto Exists

Normal actions have explicit caller input. Auto actions do not.

When runtime triggers auto internally, input source is not naturally obvious.
For simple cases, static target query is enough. For real apps, input often
comes from mixed sources:

- current request query
- cookies
- headers
- session

Dynamic resolver support exists so apps can define those rules explicitly.

## What Counts As An Auto Dependency Today

In the current runtime, an auto dependency is:

- a `GET` operation
- with `auto: true`

POST actions do not participate in auto dependency resolution.

## Configuration Surface

At server level (`createMdanServer(...)`):

- `auto.maxPasses`
- `auto.resolveRequest(context)`
- `auto.fallbackToStaticTarget`

The older `autoDependencies` option name is still accepted. If both `auto` and
`autoDependencies` are provided, runtime merges them and `auto` wins for
overlapping fields.

At app level (`createApp(...)`):

- `auto.resolveRequest(context)`
- `auto.fallbackToStaticTarget`

`maxPasses` is currently a server runtime option, not an app-level option.

## Resolver Contract

`resolveRequest(context)` receives:

- `action`: current auto GET operation
- `blockName`: block where this auto dependency is found
- `sourceRequest`: original request that led to this auto pass
- `session`: session snapshot at this pass

Return:

- a request-like object to execute as internal GET
- `null`/`undefined` to skip dynamic request for this pass

Fallback behavior:

- default: `fallbackToStaticTarget !== false`, so null result falls back to
  static target behavior
- if `fallbackToStaticTarget: false`, null result means "do not dispatch this
  auto action"

## Runtime Guardrails

For dynamic resolver output, runtime enforces:

- same-origin URL
- method must be `GET`
- request shape must be valid (`url` string, `headers` object)
- `Accept` is forced to `text/markdown` for internal dispatch
- auto GET request body is stripped (including POST-origin flows)

These rules keep internal auto dispatch predictable and safe.

## Current Runtime Behavior

The current runtime resolves auto dependencies incrementally.

Practical behavior today:

- runtime looks for the first auto GET operation in page or fragment blocks
- it resolves one auto dependency per pass
- if that result returns another page or fragment with another auto dependency,
  runtime may continue into another pass
- the loop stops when no auto dependency is found or `maxPasses` is reached

This is why `maxPasses` exists: it bounds fan-out and prevents accidental
infinite auto chains.

## Example: Weather Root Resolver

```ts
import { createApp, fields } from "@mdanai/sdk/app";

const resolveRootSchema = fields.object({
  location: fields.string(),
  range: fields.string(),
  date: fields.date(),
  timezone: fields.string(),
  locale: fields.string()
}).schema;

const app = createApp({
  auto: {
    resolveRequest({ action, sourceRequest }) {
      if (action.name !== "resolve_root") return null;

      const source = new URL(sourceRequest.url);
      const target = new URL(action.target, sourceRequest.url);

      for (const key of ["location", "range", "date", "timezone", "locale"]) {
        const value = source.searchParams.get(key);
        if (value) target.searchParams.set(key, value);
      }

      return {
        ...sourceRequest,
        method: "GET",
        url: target.toString()
      };
    }
  }
});

const home = app.page("/", {
  markdown: "# Weather\n\n<!-- mdan:block id=\"main\" -->",
  actionJson: {
    version: "mdan.page.v1",
    blocks: {
      main: {
        actions: ["resolve_root"]
      }
    },
    actions: {
      resolve_root: {
        label: "Resolve Root",
        verb: "read",
        target: "/resolve",
        auto: true,
        transport: { method: "GET" },
        input_schema: resolveRootSchema
      }
    }
  },
  render(content: string) {
    return { main: content };
  }
});

app.route(home.bind("root"));

app.read("/resolve", ({ inputs }) => {
  const location = String(inputs.location ?? "missing");
  return home.bind(location).render();
});
```

The important part is that the auto action still resolves through a normal GET
handler.

`auto.resolveRequest(...)` only decides how the internal request is built.

The `/resolve` route still owns the actual read logic and still decides what
page or fragment comes back.

## What App Code Owns Vs What Runtime Owns

App code owns:

- how source request data maps into the internal GET request
- what the target GET route does
- what page or fragment is returned

Runtime owns:

- finding eligible auto GET operations
- dispatching internal GET requests
- validating resolver output
- forcing predictable request semantics
- repeating passes up to the configured limit

That split is important: runtime executes auto dependencies, but your app still
defines their meaning.

## Practical Caveats

Because this feature is still new, keep these caveats in mind:

- prefer simple static auto first
- add dynamic resolver logic only when source-dependent request mapping is
  genuinely needed
- keep resolver logic deterministic and side-effect-free
- do not assume this is yet the final public shape of the feature
- rely on explicit GET handlers for the actual data-loading behavior

The current repository has runtime tests for:

- pass limits
- legacy `autoDependencies` compatibility
- `auto` plus `autoDependencies` merge behavior
- dynamic resolver request rewriting
- same-origin and request-shape validation
- natural browser document reads resolving auto dependencies before runtime
- page, fragment, and session metadata propagation
- POST-origin body stripping during internal auto GET dispatch

## Practical Guidance

- use static auto first for simple fixed-target flows
- add dynamic resolver when source-dependent request construction is required
- keep resolver deterministic and side-effect-free
- treat runtime as execution/validation layer, keep business mapping in app code

## Related Docs

- [Server Behavior](/server-behavior)
- [API Reference](/api-reference)
- [Action JSON](/action-json)
- [Action Execution](/spec/action-execution)
