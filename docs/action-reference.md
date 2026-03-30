---
title: Action Reference
description: Action declaration and handler behavior in createHostedApp.
---

# Action Reference

Each hosted action is explicit and target-first.

## Action Shape

```ts
{
  target: "/post",
  methods: ["POST"],
  routePath: "/guestbook",
  blockName: "guestbook",
  handler: ({ inputs, block, page, request, session }) => block()
}
```

## Required Fields

- `target`
- `methods`
- `routePath`
- `blockName`
- `handler`

## Handler Helpers

Common helpers in action context:

- `block()`
- `page()`

## Result Helpers

Use server helpers when needed:

- `ok(...)`
- `fail(...)`
- `block(...)`
- `stream(...)`
- `signIn(...)`
- `signOut()`
- `refreshSession(...)`

See [API Reference](/docs/api-reference) for details.

## Handler Patterns

### Read Action (GET)

```ts
handler: ({ block }) => block()
```

### Write Action (POST)

```ts
handler: ({ inputs, block }) => {
  // mutate domain state
  return block();
}
```

## Common Pitfalls

- `blockName` typo causes runtime mismatch.
- Write requests sent without `text/markdown` content type.
- Action returns stale page object after state mutation.
