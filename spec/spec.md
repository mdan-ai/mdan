# MDAN Spec

This document is the complete MDAN specification body for the current repository state.

If you want the public versioned entry, use:

- [MDAN Spec v1](./v1.md)

## Scope

This document expands the current public v1 profile into a fuller specification body.

It defines:

- the canonical Markdown form of an MDAN page
- the executable `mdan` fenced block format
- interaction primitives such as `BLOCK`, `INPUT`, `GET`, and `POST`
- parsing and validation constraints
- how MDAN pages and fragments are exchanged over HTTP
- host-facing execution responsibilities such as `auto`, recovery, and session continuity

It does not define:

- SDK-specific APIs
- framework adapters
- browser rendering details
- non-HTTP transports

## Canonical Source

The canonical source of an MDAN page is Markdown.

HTML is a browser-facing projection of the same app state, not the canonical source.

## Document Model

An MDAN page source is a Markdown document that may contain:

- frontmatter
- Markdown body content
- zero or one executable `mdan` fenced block
- zero or more block anchors

An MDAN fragment is a Markdown response that represents the next state of one interaction region rather than a full page.

### Executable `mdan` Block

The executable interaction block uses a fenced code block with info string `mdan`:

````md
```mdan
BLOCK guestbook {
  INPUT text required -> message
  GET "/list" -> refresh
  POST "/post" (message) -> submit
}
```
````

Rules:

- a page may contain at most one executable `mdan` fenced block
- blank lines inside the executable block are ignored
- content outside the executable block remains part of the page Markdown body

### Non-Executable Source Blocks

A fenced block such as `mdan-src` is display-only source content and is not part of MDAN execution semantics.

For example:

````md
```mdan-src
```mdan
BLOCK guestbook {
  INPUT text -> nickname
}
```
```
````

Content inside display-only blocks does not participate in parsing, validation, or anchor binding.

## Interaction Grammar

The main MDAN keywords are:

- `BLOCK`
- `INPUT`
- `GET`
- `POST`

Supported operation modifiers are:

- `auto`
- `label:"..."`
- `accept:"..."`

Keywords are case-sensitive. The canonical forms shown in this spec must be used.

### `BLOCK`

`BLOCK` defines an interaction scope.

Form:

```mdan
BLOCK <name> {
  ...
}
```

Rules:

- block names must match `[a-zA-Z_][\\w-]*`
- one executable `mdan` block may declare multiple `BLOCK`s
- block names must be unique within a page
- `INPUT`, `GET`, and `POST` declarations must appear inside a `BLOCK`

### `INPUT`

`INPUT` defines a named input available inside the current block.

Form:

```mdan
INPUT <type> [required] [secret] [options] -> <name>
```

Supported input types:

- `text`
- `number`
- `boolean`
- `choice`
- `asset`

Supported modifiers:

- `required`
- `secret`
- a `choice` option list

Examples:

```mdan
INPUT text -> nickname
INPUT text required -> message
INPUT text required secret -> password
INPUT choice ["draft","published"] -> status
```

Rules:

- input names must match `[a-zA-Z_][\\w-]*`
- input names must be unique within a block
- only `choice` may declare an option list
- `choice` must declare at least one option

### `GET`

`GET` defines a read operation.

Forms:

```mdan
GET "/list" -> refresh
GET "/list" -> load_messages auto
GET "/list" (cursor) -> load_more label:"Load More"
GET "/stream" accept:"text/event-stream"
```

Rules:

- the target must be a double-quoted string
- every referenced input must already be declared in the current block
- a normal `GET` must declare an operation name
- a stream read using `accept:"text/event-stream"` may omit the operation name
- a stream read must not declare an operation name
- operation names share one namespace across `GET` and `POST` within a block
- `label:"..."` declares a human-readable label and does not change execution semantics

### `POST`

`POST` defines a write operation.

Form:

```mdan
POST "/post" (nickname, message) -> submit label:"Send Message"
```

Rules:

- the target must be a double-quoted string
- `POST` must declare an input list
- `POST` must declare an operation name
- every referenced input must already be declared in the current block
- operation names must be unique within the block

### Operation Names And Labels

Examples:

```mdan
GET "/list" -> load_more label:"Load More"
POST "/login" (email, password) -> sign_in label:"Sign In"
```

Rules:

- operation names must match `[a-zA-Z_][\\w-]*`
- `label:"..."` uses a double-quoted string
- `label` affects display, not target, method, or input binding
- `auto` is an execution modifier, not a display modifier

## Block Anchors

MDAN uses Markdown comment anchors to bind named blocks back into page body regions.

Form:

```md
<!-- mdan:block guestbook -->
```

Rules:

- anchor names must match `[a-zA-Z_][\\w-]*`
- anchors are recognized only in normal Markdown body content
- fenced code blocks do not create anchors
- anchor names must be unique within a page

Structure constraints:

- if a page contains any block anchors, each declared `BLOCK` must have a matching anchor
- each anchor must match a declared `BLOCK`
- a page may also contain no block anchors

## Parsing Result

A conforming page parser should be able to produce at least:

- `frontmatter`
- `markdown`
- `blocks`
- `blockAnchors`

Where:

- `markdown` is the page body with the executable `mdan` block removed
- `blocks` are parsed `BLOCK` declarations
- `blockAnchors` are parsed `<!-- mdan:block ... -->` references

A typical parse flow is:

1. parse frontmatter
2. extract and remove the executable `mdan` fenced block
3. parse `BLOCK`, `INPUT`, `GET`, and `POST`
4. scan body content for block anchors
5. validate structural constraints

## Validation Rules

A conforming implementation should reject at least these invalid structures:

- more than one executable `mdan` fenced block in a page
- duplicate block names
- duplicate block anchor names
- anchors that reference missing blocks
- pages with anchors where some blocks are not anchored
- duplicate input names inside a block
- duplicate operation names inside a block
- `GET` or `POST` operations that reference undeclared inputs
- a normal `GET` without an operation name
- a stream `GET` with an operation name
- invalid `choice` declarations
- invalid `auto` combinations

## HTTP Binding

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

### Media Type And Profile

Canonical Markdown responses use:

```http
Content-Type: text/markdown; profile="https://mdan.ai/spec/v1"
```

The base media type remains `text/markdown`.

### Representation Negotiation

The same route may expose both:

- `text/markdown`
- `text/html`

Rules:

- explicit `Accept: text/markdown` should return canonical Markdown
- explicit `Accept: text/html` should return HTML
- unsupported `Accept` values should return `406 Not Acceptable`
- the Markdown response should use the MDAN spec profile

### Markdown Request Bodies

For direct-write requests, `POST` uses:

```http
Content-Type: text/markdown
```

The canonical request body form is a comma-separated list of Markdown key-value pairs:

```md
nickname: "Guest", message: "Hello"
```

Each value is a JSON string literal.

Compatibility note:

- implementations may accept newline-separated entries for compatibility
- implementations should emit the comma-separated canonical form when serializing request bodies

### Action Parameters

- `GET` action inputs are carried through the request URL
- `POST` action inputs are carried through the Markdown request body

### Response Shapes

A conforming host may return either:

- a full page Markdown document
- a Markdown fragment representing the next state of the current interaction region

Response expectations:

- a page route returns full page Markdown
- a block-local action may return a block-local fragment
- responses may contain new interaction structure for the next step
- error responses may also return Markdown content and follow-up operations

Representation expectations:

- explicit `Accept: text/markdown` should return `text/markdown`
- otherwise a host may project the same result as HTML
- browser-facing HTML does not replace the canonical Markdown form

### Error And Recovery

Errors fall into two broad categories:

- parse or structural errors
- runtime interaction errors

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

## Execution Semantics

### Block Update Semantics

By default:

- a block-local `GET` or `POST` updates the current interaction region
- static page body does not change unless a full page response is returned
- other blocks do not change unless the returned result explicitly represents a new full page

### Full-Page Transition Semantics

A host should treat the result as a full-page transition when:

- the response is a full page Markdown document
- or the operation explicitly leads to a different page route

### `auto`

`auto` is a host-side execution instruction, not a browser-only hint.

If a page or fragment contains an `auto GET`, the host should resolve that dependency before returning the final result to any client.

Rules:

- `auto` is allowed only on `GET`
- `auto` is allowed only on zero-input operations
- `auto` must not be combined with stream reads
- at most one `auto GET` may appear in the same block
- the corresponding target should be safe, idempotent, and side-effect free

Intent:

- `auto` marks a dependency that should not be exposed as an intermediate client step
- agents and browsers should observe the same resolved result
- if an intermediate step should remain visible to the client, it must not be marked `auto`

## Session Semantics

Session lifecycle belongs to the host/runtime layer, but the MDAN specification constrains how session-dependent interaction should appear at the Markdown surface.

Rules:

- the host/runtime is responsible for creating, validating, refreshing, and clearing session state
- session state is carried through ordinary HTTP mechanisms such as cookies
- the page grammar does not introduce a separate session keyword
- when a page or action requires authorization, an unauthorized response should return a recoverable Markdown result whenever continued interaction is possible
- login, register, logout, and similar actions should still return Markdown pages or fragments that describe the next step
- when a session becomes invalid, the returned result should guide the client back to a recoverable next operation
- if a recovery path includes an `auto` read dependency, the host should resolve it before returning the final result

## Relationship To HTML

HTML is the browser-facing projection of the same app.

For HTML responses, a host should help agents discover the canonical Markdown source through:

- `rel="alternate" type="text/markdown"`
- optional `rel="llms-txt"` when the site explicitly provides a real `llms.txt`
- optional equivalent `Link` headers

The profile itself belongs on the Markdown response, not on the HTML response.

## Host Conformance

A conforming MDAN host/runtime should be able to:

- parse one executable `mdan` fenced block from a Markdown page
- ignore `mdan-src` and other display-only code blocks for execution purposes
- discover `mdan:block` anchors in normal Markdown body content
- validate the structural consistency of blocks, inputs, operations, and anchors
- treat declared `GET` and `POST` targets as stable HTTP paths
- provide both Markdown and HTML representations of the same app state
- return a fragment or page that remains understandable to a client after both success and failure cases
- manage session lifecycle and expose recoverable next steps for unauthorized or expired sessions
- support stream-read semantics for `accept:"text/event-stream"` operations
- resolve explicit `auto GET` dependencies consistently before returning the final result to any client

## Minimal Example

````md
---
title: Guestbook
---

# Guestbook

<!-- mdan:block guestbook -->

```mdan
BLOCK guestbook {
  INPUT text -> nickname
  INPUT text required -> message
  GET "/list" -> load_messages auto
  GET "/list" -> refresh label:"Refresh"
  POST "/post" (nickname, message) -> submit label:"Submit"
}
```
````

In this page:

- the body is ordinary Markdown
- `guestbook` is a named interaction block
- `/list` is a read target
- `load_messages auto` means the host may resolve that read dependency before returning the final result
- `/post` is a write target
- `<!-- mdan:block guestbook -->` is the body anchor for that block

