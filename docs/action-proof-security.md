# Action Proof Security

For normative protocol rules, see [Action Proof](/spec/action-proof).

This page describes how the current TypeScript SDK implements action-proof
protected execution. Action proof is the default execution guard for MDAN
actions. It is not a page-access token, a replacement for authentication, or a
business authorization check. It is a short-lived server-signed capability that
proves an action request follows an action the server issued in a previous
surface response.

## Current SDK Security Boundary

MDAN separates page reads from action execution:

- Page reads are entry points. Initial page requests do not carry action proof.
- Page responses issue executable actions. Every executable action should carry
  an action proof unless proofing is explicitly disabled.
- Action requests consume capabilities. Every action request must submit the
  server-issued proof by default.

This keeps first page loads and browser refreshes simple while making action
execution follow the server-declared next actions.

`auto` dependencies are not an action-proof bypass. Auto resolution is a
server-internal read path for `GET` dependencies only; external `POST` action
execution still requires a server-issued proof by default.

## Current SDK Default Policy

Action proof is enabled by default.

Hosts may explicitly disable it for tests, demos, or trusted local experiments:

```ts
createMdanServer({
  actionProof: {
    disabled: true
  }
});
```

Disabling action proof means the runtime will not issue `action_proof` metadata
and will not require `action.proof` on action requests.

## Current SDK Issued Claims

The current action proof signs these action contract fields:

- action identity
- HTTP method
- target path
- declared input names
- input schema
- issue time and expiration time
- confirmation requirement

These claims prevent clients and agents from changing the action target, method,
accepted field set, input schema, or confirmation requirement after the server
issues the action.

## Current SDK Request Format

JSON action requests use the action wrapper:

```json
{
  "action": {
    "proof": "<server-issued action proof>"
  },
  "input": {
    "field": "value"
  }
}
```

Form and query submissions may use flat metadata fields:

```text
action.proof=<server-issued action proof>
field=value
```

High-risk actions may also require:

```json
{
  "action": {
    "proof": "<server-issued action proof>",
    "confirmed": true
  },
  "input": {}
}
```

## What The Current SDK Does Not Replace

Action proof does not replace:

- route authentication
- user, tenant, or resource authorization
- session checks
- CSRF protections outside the MDAN action channel
- business validation
- replay protection
- state-version conflict checks

Handlers must still verify that the current session can perform the requested
operation on the requested resource.

## Future Hardening Ideas

The next useful strengthening is to bind proofs to more of the MDAN surface
context:

- `app_id`
- `state_id`
- `state_version`
- page route
- block id
- subject/session scope
- one-time nonce for high-risk actions

Those additions would make the proof represent not just an action shape, but the
current user and state that received it.
