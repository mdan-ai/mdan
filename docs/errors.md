# Error Model And Status Codes

MDAN errors are part of the runtime contract. Clients should handle non-2xx
responses as recoverable protocol states whenever the response body remains
directly readable, whether that body is a Markdown artifact or a legacy JSON
compatibility response.

## Response Representations

Preferred clients should request:

```http
Accept: text/markdown
```

In that path, runtime-generated errors are returned as readable Markdown:

```md
## Not Found
```

Legacy clients may still request:

```http
Accept: application/json
```

In compatibility paths, runtime-generated errors may still be returned as legacy
JSON compatibility responses:

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

Default runtime-generated error responses expose no executable actions unless
the application handler returns a richer custom recovery surface.

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
- action requests do not support `Accept: text/html`
- HTML is only available for page `GET` requests where a browser shell host is involved

`413 Payload Too Large`

The host adapter rejected the raw request body before runtime handling because
it exceeded `maxBodyBytes`.

`415 Unsupported Media Type`

A `POST` action request with a body did not use `Content-Type:
application/json` after host-level form normalization.

`500 Internal Server Error`

The handler threw, session commit/clear failed, or the returned result violated
one of the SDK contracts.

## Contract Violations

Contract violations are host/application bugs, not user input errors.

The runtime returns `500` for:

- page handlers that do not return artifact-native pages or legacy compatibility envelopes
- action handlers that do not return artifact-native action results, legacy compatibility envelopes, or stream results
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

Applications may also return their own `400` Markdown artifact or legacy JSON
compatibility response when business-level validation fails. Prefer returning a
normal artifact with useful content and allowed recovery actions.

For example, a readable-surface recovery result can look like:

```ts
return {
  status: 400,
  markdown: `# Upload failed

::: block{id="error" trust="untrusted"}
:::`,
  actions: {
    blocks: ["error"],
    actions: [],
    allowed_next_actions: []
  },
  route: "/upload",
  regions: {
    error: "Attachment is required."
  }
};
```

As with other readable-surface results, the runtime fills in `app_id`,
`state_id`, and `state_version` before final artifact serialization when the
server is configured with `createMdanServer({ appId })`.

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

Malformed request bodies return `400` with an `Invalid Request Body` response.

For artifact-first clients, read the body directly. For legacy JSON clients,
parse the body as the legacy compatibility JSON shape first. In both cases,
`allowed_next_actions` is empty unless an application handler produced a richer
recovery surface.

## Unsupported Media Type

Raw JSON action submissions must use:

```http
Content-Type: application/json
Accept: text/markdown
```

Browser form requests are normalized by host adapters before they reach the
runtime. If a form request still reaches the runtime as a non-JSON `POST`, it
will be rejected with `415`.

## Not Acceptable

Use these defaults:

- page read: `Accept: text/markdown`
- action request: `Accept: text/markdown`
- stream action request: `Accept: text/event-stream`
- legacy compatibility read: `Accept: application/json`

Do not request `text/html` directly from the runtime for actions. HTML is a host
adapter/browser-shell concern.

## Headless Host Error State

The headless host treats non-2xx responses as `error` status.

If the response body is a Markdown artifact, the host can still adapt and show
the server-provided error content. If the response is a legacy JSON
compatibility response, the host can still bridge it. If the body is unreadable
as either artifact or legacy JSON, the host reports a runtime error such as
`Runtime returned an unreadable response.`

Custom frontends should follow the same pattern:

1. check HTTP status
2. try to parse a Markdown artifact first
3. fall back to legacy JSON only when needed
4. render the returned content if present
5. avoid inventing next actions when `allowed_next_actions` is empty
