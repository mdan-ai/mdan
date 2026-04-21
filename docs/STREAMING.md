# Streaming And SSE

The server runtime supports streaming action responses through `stream(...)` and
`Accept: text/event-stream`.

Streaming is useful for long-running generated output, incremental logs, or
progress updates. Ordinary page, form, and agent flows should usually return a
normal Markdown artifact instead.

## Handler Result

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

## Chunk Types

Each stream chunk may be:

- a string
- a fragment object

String chunks are sent as Markdown text.

Fragment chunks are serialized with the same Markdown fragment serializer used
by non-stream action results.

## Accept Header

Clients must explicitly request streaming:

```http
Accept: text/event-stream
```

`text/event-stream` is for action results only.

Page reads with `Accept: text/event-stream` return `406 Not Acceptable`.

Ordinary non-stream action requests should usually use `Accept: text/markdown`
and return a normal Markdown artifact.
If a `POST` action requests `text/event-stream` but the runtime path is not a
stream result, the current runtime rejects the request as an action
representation mismatch before calling the handler.

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

## Non-Stream Fallback

The response serializer can serialize a non-stream fragment as a single SSE
message when called directly with `event-stream`.

The public runtime path is stricter for action requests: page routes reject
`text/event-stream`, and non-stream action handlers should generally return
`text/markdown` instead. Treat SSE as a stream-action feature, not as an
alternate representation for ordinary surfaces.

## Browser And Headless Boundary

The current headless host is Markdown-first for page and artifact reads. It can
still interoperate with legacy JSON responses where needed, but the preferred
path is Markdown artifacts for page reads and normal action results.

The default UI therefore does not yet provide a full streaming UI
contract. Custom clients can consume stream action endpoints directly with
`fetch()` and an SSE parser, but they must own rendering, cancellation, and
final-state reconciliation.

When a stream produces a final page state that should be visible to normal MDAN
clients, expose a follow-up action or route that returns the final Markdown
artifact.

## When To Use Streaming

Use streaming when:

- partial output is useful before the operation finishes
- the operation may take noticeably longer than ordinary form submission
- the client has explicit SSE handling
- the interaction is read/progress-oriented or has a clear final recovery route

Return a normal Markdown artifact when:

- the result is a page or region update
- agents need to inspect `allowed_next_actions`
- the default browser UI should handle the interaction
- the response includes recoverable validation errors
- the action changes session state and the client needs a stable next surface

## Contract Notes

Stream results are not readable-surface or artifact page responses, and they do
not pass through the legacy compatibility envelope validation path either.

Action proof can protect the request that starts a stream, but stream chunks do
not carry action proofs and do not expose next actions.

Do not put executable action metadata only in streamed Markdown. Expose
follow-up actions through a normal Markdown artifact.
