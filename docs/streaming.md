---
title: Streaming And SSE
description: Use `stream(...)` from `@mdanai/sdk/server` for incremental action output in the current SDK, and understand when streaming fits better than a normal Markdown response.
---

# Streaming And SSE

Use this page when you want to stream incremental action output in the current
SDK.

This is an SDK usage guide, not the normative spec.

For protocol-layer execution rules, use [Action Execution](/spec/action-execution).

## When To Use Streaming

Use streaming when:

- partial output is useful before the operation finishes
- the operation may take noticeably longer than an ordinary action
- the client explicitly supports SSE consumption
- the flow is progress-oriented or log-oriented

Return a normal Markdown response when:

- the result is a page or region update
- agents need a stable next action contract
- the default browser flow should handle the interaction normally
- the response should become the next stable readable surface

## The SDK Entry Point

Import `stream` from the server package:

```ts
import { stream } from "@mdanai/sdk/server";
```

Return it from an action handler:

```ts
server.post("/draft", async () => {
  async function* chunks() {
    yield "Starting draft...";
    yield {
      markdown: "## Draft\n\nFirst paragraph.",
      blocks: []
    };
  }

  return stream(chunks());
});
```

`stream(source, result?)` accepts an iterable or async iterable. `result` may
carry status, headers, route, or session metadata supported by stream results.

## What You Can Yield

Each stream chunk may be:

- a string
- a fragment object

String chunks are sent as Markdown text.

Fragment chunks are serialized with the same Markdown fragment serializer used
by non-stream action results.

## What The Client Must Request

Clients must explicitly request streaming:

```http
Accept: text/event-stream
```

`text/event-stream` is for action results only.

Page reads with `Accept: text/event-stream` return `406 Not Acceptable`.

Ordinary non-stream action requests should still use `Accept: text/markdown`.

## SSE Wire Format

The SDK serializes each Markdown chunk as one SSE message:

```text
data: first line
data: second line

```

Line endings are normalized to `\n`. Each message ends with a blank line.

The shared SSE helpers can:

- serialize a Markdown string into one SSE message
- parse complete SSE content into messages
- drain a partial buffer and return the remaining incomplete chunk

## Browser Boundary

The current headless host is Markdown-first for page and action reads. It can
still interoperate with readable Markdown responses where needed, but the preferred
path is Markdown responses for page reads and normal action results.

The default UI therefore does not yet provide a full streaming UI
contract. Custom clients can consume stream action endpoints directly with
`fetch()` and an SSE parser, but they must own rendering, cancellation, and
final-state reconciliation.

When a stream produces a final page state that should be visible to normal MDAN
clients, expose a follow-up action or route that returns the final Markdown
response.

## Practical Rule

Treat streaming as a specialized SDK feature for incremental output.

Do not treat it as a replacement for the normal MDAN readable surface.

If the user, browser, or agent needs a stable next interaction state, return a
normal Markdown response after the stream or provide a follow-up route/action
that does.

## Related Docs

- [Server Behavior](/server-behavior)
- [Error Model And Status Codes](/spec/error-model)
- [MDAN Action Execution](/spec/action-execution)
