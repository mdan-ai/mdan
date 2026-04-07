# MDAN Spec

This page is the complete MDAN specification.

If you want the public versioned entry, use:

- [MDAN Spec v1](./v1.md)

If you want the browser-facing host profile, use:

- [MDAN Browser Host Profile](./browser-host.md)

## Scope

This document defines:

- the canonical Markdown form of an MDAN page
- executable `mdan` blocks
- interaction primitives such as `BLOCK`, `INPUT`, `GET`, and `POST`
- parsing and validation constraints
- response, recovery, and continuation semantics
- the current HTTP binding for MDAN over HTTP
- discovery expectations for canonical Markdown over HTTP

It does not define:

- SDK-specific APIs
- framework adapters
- browser runtime internals
- browser UI behavior
- non-HTTP transports

Browser-facing host behavior is intentionally separated into:

- [MDAN Browser Host Profile](./browser-host.md)

## Canonical Source

The canonical source of an MDAN page is Markdown.

HTML may project the same app state for browser-facing hosts, but HTML is not the canonical source.

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

## Interaction Semantics

### Response Shapes

A conforming implementation may return either:

- a full page Markdown document
- a Markdown fragment representing the next state of the current interaction region

Response expectations:

- a page route returns full page Markdown
- a block-local action may return a block-local fragment
- responses may contain new interaction structure for the next step
- error responses may also return Markdown content and follow-up operations

### Error And Recovery

Errors fall into two broad categories:

- parse or structural errors
- runtime interaction errors

For runtime interaction errors, an implementation should prefer recoverable Markdown responses over opaque transport errors when the client can reasonably continue from the returned result.

A recoverable error response should:

- return an appropriate status
- include Markdown describing the failure
- include the next valid operation when recovery is possible

### Block Update Semantics

By default:

- a block-local `GET` or `POST` updates the current interaction region
- static page body does not change unless a full page response is returned
- other blocks do not change unless the returned result explicitly represents a new full page

### Full-Page Transition Semantics

An implementation should treat the result as a full-page transition when:

- the response is a full page Markdown document
- or the operation explicitly leads to a different page route

### `auto`

`auto` is an execution instruction, not a browser-only hint.

Rules:

- `auto` is allowed only on `GET`
- `auto` is allowed only on zero-input operations
- `auto` must not be combined with stream reads
- at most one `auto GET` may appear in the same block
- the corresponding target should be safe, idempotent, and side-effect free

Intent:

- `auto` marks a dependency that should not be exposed as an intermediate client step
- different hosts should expose the same resolved result
- if an intermediate step should remain visible to the client, it must not be marked `auto`

## Session Surface Semantics

Session lifecycle belongs to the host layer, but the MDAN spec constrains how session-dependent interaction should appear at the Markdown surface.

Rules:

- the grammar does not introduce a separate session keyword
- when a page or action requires authorization, an unauthorized response should return a recoverable Markdown result whenever continued interaction is possible
- login, register, logout, and similar actions should still return Markdown pages or fragments that describe the next step
- when a session becomes invalid, the returned result should guide the client back to a recoverable next operation
- if a recovery path includes an `auto` read dependency, the host should resolve it before returning the final result

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

### Direct-Write Request Bodies

`POST` submits a set of named input fields.

These field submissions may be encoded as:

- `application/x-www-form-urlencoded`
- `multipart/form-data`
- `text/markdown`

These encodings carry the same input semantics. They do not define different operation models.

Rules:

- each submitted field name must match an `INPUT` declared in the current `BLOCK`
- a conforming implementation should accept only the fields referenced by the current `POST` operation
- field values are interpreted according to the declared `INPUT` type
- a browser-facing host should support ordinary HTML form encodings
- a host that supports `INPUT asset` should support `multipart/form-data`

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

### Action Parameters Over HTTP

- `GET` action inputs are carried through the target URL
- `POST` action inputs are carried through the Markdown request body

### Error And Recovery Over HTTP

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

### Session Continuity Over HTTP

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

## Conformance Requirements

A conforming MDAN implementation should be able to:

- parse canonical Markdown pages and fragments
- parse and validate executable `mdan` blocks
- preserve anchor bindings between Markdown body and interaction blocks
- serialize canonical Markdown request and response forms
- execute MDAN interaction semantics consistently across full-page and fragment flows
- serve canonical Markdown with the MDAN profile over HTTP
- negotiate Markdown and HTML representations from the same route
- preserve recoverable interaction in error responses when possible
