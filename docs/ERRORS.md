# Error Model And Status Codes

MDAN errors are part of the runtime contract. Clients should handle non-2xx
responses as recoverable protocol states whenever the response body is a JSON
surface.

## Response Representations

When a client requests:

```http
Accept: application/json
```

runtime-generated errors are returned as JSON surface envelopes:

```json
{
  "content": "## Not Found",
  "actions": {
    "app_id": "mdan",
    "state_id": "mdan:error:404",
    "state_version": 1,
    "blocks": [],
    "actions": [],
    "allowed_next_actions": []
  },
  "view": {
    "route_path": "/missing"
  }
}
```

The error surface exposes no executable actions unless the application handler
returns a custom error surface with actions.

When a client requests Markdown, the body is readable Markdown. When a request
asks for an unsupported representation, the runtime usually falls back to a
Markdown error so the failure remains readable.

## Common Status Codes

`400 Bad Request`

The request body, action proof, action confirmation, submitted fields, or input
schema validation failed. Examples include malformed JSON, missing
`action.proof`, undeclared action inputs, and missing confirmation for a
confirmed action.

`404 Not Found`

No page or action route matched the request method and path.

`406 Not Acceptable`

The requested `Accept` representation is not available for that route or
request kind. Examples:

- page reads do not support `Accept: text/event-stream`
- action requests must use `Accept: application/json`
- HTML is only available for page `GET` requests where a browser shell host is
  involved

`413 Payload Too Large`

The host adapter rejected the raw request body before runtime handling because
it exceeded `maxBodyBytes`.

`415 Unsupported Media Type`

A `POST` action request with a body did not use `Content-Type:
application/json` after host-level form normalization.

`500 Internal Server Error`

The handler threw, session commit/clear failed, or the returned surface violated
one of the SDK contracts.

## Contract Violations

Contract violations are host/application bugs, not user input errors.

The runtime returns `500` for:

- page handlers that do not return JSON surface envelopes
- action handlers that do not return JSON surface envelopes or stream results
- invalid actions contracts
- invalid semantic slots when semantic-slot validation is enabled
- invalid agent blocks

Contract violations should be fixed in application code. Agents and browser
clients should not retry the same action expecting different behavior unless the
host state changed.

## User Input Violations

User input violations return `400`.

These include:

- invalid request body syntax
- invalid action request wrapper
- missing or invalid action proof
- undeclared payload fields under action proof
- input values rejected by the action input schema
- missing explicit confirmation for an action that requires it
- custom `validatePostRequest` rejection

Applications may also return their own `400` JSON surface when business-level
validation fails. Prefer returning a normal surface with useful content and
allowed recovery actions.

## Action Proof Errors

With action proof enabled, JSON action requests should use:

```json
{
  "action": {
    "proof": "<server-issued proof>"
  },
  "input": {
    "field": "value"
  }
}
```

Common proof failures:

- missing action wrapper or proof
- proof does not verify
- submitted target/method/input shape does not match the issued proof
- confirmation is required but `action.confirmed` is not true

See `ACTION-PROOF-SECURITY.md` for proof semantics and boundaries.

## Invalid Request Body

Malformed request bodies return `400` with an `Invalid Request Body` surface.

For JSON clients, parse the body as a JSON surface first. The body content
contains the readable error detail, and `allowed_next_actions` is empty unless
an application handler produced a richer recovery surface.

## Unsupported Media Type

Raw JSON action submissions must use:

```http
Content-Type: application/json
Accept: application/json
```

Browser form requests are normalized by host adapters before they reach the
runtime. If a form request still reaches the runtime as a non-JSON `POST`, it
will be rejected with `415`.

## Not Acceptable

Use these defaults:

- page read: `Accept: application/json`
- action request: `Accept: application/json`
- stream action request: `Accept: text/event-stream`
- human/debug page read: `Accept: text/markdown`

Do not request `text/html` directly from the runtime for actions. HTML is a host
adapter/browser-shell concern.

## Headless Host Error State

The headless browser host treats non-2xx responses as `error` status.

If the response body is a JSON surface, the host still adapts the surface so the
UI can show the server-provided error content. If the body is not a JSON
surface, the host reports a runtime error such as `Expected JSON surface bundle
response.`

Custom frontends should follow the same pattern:

1. check HTTP status
2. try to parse a JSON surface
3. render the returned content if present
4. avoid inventing next actions when `allowed_next_actions` is empty
