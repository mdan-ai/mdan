# MDAN HTTP Binding

This document defines how MDAN is exchanged over HTTP.

If you want the language-agnostic core, use:

- [MDAN Core Spec](./core.md)

If you want the public versioned entry, use:

- [MDAN Spec v1](./v1.md)

## Scope

This document defines:

- the MDAN media type and profile
- how clients negotiate Markdown and HTML representations
- how Markdown request bodies are sent
- how page and fragment responses are returned over HTTP
- how recovery, sessions, and discovery fit into HTTP semantics

It does not define:

- SDK-specific APIs
- browser runtime internals
- DOM behavior
- non-HTTP transports

## HTTP Representation

MDAN is defined over HTTP in the current public specification.

Targets written in page operations are the HTTP paths to invoke. They are not hidden RPC names or implementation-private route identifiers.

Example:

```mdan
BLOCK guestbook {
  GET "/list" -> refresh
  POST "/post" (message) -> submit
}
```

The corresponding HTTP operations are:

- `GET /list`
- `POST /post`

## Media Type And Profile

Canonical Markdown responses use:

```http
Content-Type: text/markdown; profile="https://mdan.ai/spec/v1"
```

The base media type remains `text/markdown`.

## Representation Negotiation

The same route may expose both:

- `text/markdown`
- `text/html`

Rules:

- explicit `Accept: text/markdown` should return canonical Markdown
- explicit `Accept: text/html` should return HTML
- unsupported `Accept` values should return `406 Not Acceptable`
- the Markdown response should use the MDAN spec profile

## Direct-Write Request Bodies

`POST` submits a set of named input fields.

These field submissions may be encoded as:

- `application/x-www-form-urlencoded`
- `multipart/form-data`
- `text/markdown`

These encodings carry the same input semantics.

Rules:

- each submitted field name must match an `INPUT` declared in the current `BLOCK`
- a conforming implementation should accept only the fields referenced by the current `POST` operation
- field values are interpreted according to the declared `INPUT` type
- browser-facing hosts should support ordinary HTML form encodings
- hosts that support `INPUT asset` should support `multipart/form-data`

### `text/markdown` Direct-Write Encoding

For direct-write requests, `POST` may use:

```http
Content-Type: text/markdown
```

The Markdown form is a list of key-value pairs.

Implementations should accept both:

- a comma-separated form
- a newline-separated form

Canonical serialized form:

```md
nickname: "Guest", message: "Hello"
```

Compatible newline-separated form:

```md
nickname: "Guest"
message: "Hello"
```

The current TypeScript reference implementation serializes the comma-separated form and accepts both forms when parsing.

### Field Value Interpretation

Field values are interpreted according to the declared `INPUT` type:

- `text` as text
- `number` as a numeric value
- `boolean` as a boolean value
- `choice` as one of the declared option values
- `asset` as an uploaded file or asset reference

The current TypeScript reference implementation currently normalizes Markdown direct-write fields as string values. Wider typed input parsing is a future implementation expansion, not a different operation model.

## Response Shapes

Response expectations:

- a page route returns full page Markdown
- a block-local action may return a block-local fragment
- responses may contain new interaction structure for the next step
- error responses may also return Markdown content and follow-up operations

Representation expectations:

- explicit `Accept: text/markdown` should return `text/markdown`
- otherwise a host may project the same result as HTML
- browser-facing HTML does not replace the canonical Markdown form

## Error And Recovery Over HTTP

For runtime interaction errors, a host should prefer recoverable Markdown responses over opaque transport errors when the client can reasonably continue from the returned result.

A recoverable error response should:

- return an appropriate HTTP status
- include Markdown describing the failure
- include the next valid operation when recovery is possible

Typical runtime and HTTP errors include:

- `406 Not Acceptable`
- `404` when an action target is not found
- `415 Unsupported Media Type` when a direct-write request is not Markdown
- `401` for unauthorized access
- `500` for uncaught action failures

## Session Continuity Over HTTP

Rules:

- session state is carried through ordinary HTTP mechanisms such as cookies
- the host/runtime is responsible for creating, validating, refreshing, and clearing session state
- Markdown responses should still describe the next step after login, logout, expiry, or unauthorized access

## Relationship To HTML

HTML is the browser-facing projection of the same app.

For HTML responses, a host should help agents discover the canonical Markdown source through:

- `rel="alternate" type="text/markdown"`
- optional `rel="llms-txt"` when the site explicitly provides a real `llms.txt`
- optional equivalent `Link` headers

The profile itself belongs on the Markdown response, not on the HTML response.

## Discovery

A host may expose MDAN discovery through:

- `rel="alternate" type="text/markdown"`
- `rel="llms-txt"`
- equivalent HTTP `Link` headers
- site-level `llms.txt`

These mechanisms help clients discover the canonical Markdown source without redefining the app as HTML-first.

## HTTP Conformance Requirements

A conforming MDAN HTTP implementation should be able to:

- serve canonical Markdown with the MDAN profile
- negotiate Markdown and HTML representations from the same route
- accept Markdown direct-write request bodies for `POST`
- return page and fragment responses over HTTP
- preserve recoverable interaction in error responses when possible
- carry session continuity through ordinary HTTP mechanisms
