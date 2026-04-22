# UI Action Semantics

This document describes how protocol action fields are projected into browser
and default UI behavior.

The rules here are deterministic UI semantics. They do not change server-side
authorization, action proof validation, or business logic.

## Semantic Inputs

The UI action model is derived from:

- `verb`
- `transport.method`
- `state_effect.response_mode`
- `state_effect.updated_regions`
- `guard.risk_level`
- action `id`, `label`, and `target`
- `security.confirmation_policy`

Protocol fields use `snake_case`. The SDK adapter projects them into internal
camelCase operation metadata such as `stateEffect.responseMode`,
`stateEffect.updatedRegions`, and `guard.riskLevel`.

## Behavior

UI behavior answers: what kind of interaction is this action expected to
produce?

The SDK resolves behavior in this order:

1. `verb: "read"` becomes `read`.
2. `state_effect.response_mode: "region"` becomes `region`.
3. `state_effect.response_mode: "page"` with `verb: "navigate"` or `GET`
   becomes `page`.
4. `state_effect.response_mode: "page"` with another method/verb becomes
   `submit`.
5. `verb: "navigate"` or `GET` becomes `page`.
6. Everything else becomes `submit`.

Use `navigate` for route changes, `read` for refresh/read-only operations, and
`write` for actions that mutate application state.

## Variant

Variant answers: how should a default UI style the action?

The SDK resolves variant in this order:

1. `guard.risk_level: "high"` or `"critical"` becomes `danger`.
2. logout-like actions become `quiet`.
3. `submit` behavior becomes `primary`.
4. `page` behavior becomes `secondary`.
5. `read` and `region` behavior become `quiet`.

Logout detection is intentionally simple. If the action name, label, or target
contains `logout` or `log out`, the default UI treats it as a quiet utility
action unless it is high/critical risk.

Use `guard.risk_level` for destructive or sensitive actions. Do not rely on
button color as a security boundary.

## Dispatch Mode

Dispatch mode answers: should the browser visit a route or submit an action
request?

The SDK resolves dispatch mode as:

- `GET` + `page` behavior + empty payload: `visit`
- all other cases: `submit`

This means a simple navigation action can use browser-style route visiting:

```json
{
  "id": "open_settings",
  "verb": "navigate",
  "target": "/settings",
  "transport": { "method": "GET" },
  "state_effect": { "response_mode": "page" }
}
```

A `GET` action with input values still uses submit semantics so the headless
host can serialize the payload into the query string and preserve action proof
metadata when present.

## Page Actions

Use page actions when the result should replace the current page snapshot or
move the user to another route.

Recommended shape:

```json
{
  "id": "open_detail",
  "label": "Open detail",
  "verb": "navigate",
  "target": "/items/alpha",
  "transport": { "method": "GET" },
  "state_effect": { "response_mode": "page" }
}
```

When the returned result resolves to a new route, the headless host updates
browser history for page transitions initiated by actions.

## Region Actions

Use region actions when the current route should stay stable and only named
regions should update.

Recommended shape:

```json
{
  "id": "refresh_messages",
  "label": "Refresh messages",
  "verb": "read",
  "target": "/guestbook/messages",
  "transport": { "method": "GET" },
  "state_effect": {
    "response_mode": "region",
    "updated_regions": ["messages"]
  }
}
```

For region transitions to remain stable:

- keep the returned route equal to the current route
- include every listed `updated_regions` entry in the returned regions
- keep block ids stable across updates

If the route changes or no expected region is present, the headless host falls
back to a page replacement.

## Submit Actions

Use submit actions for state-changing operations that produce either a new page
or a region update.

Recommended shape:

```json
{
  "id": "submit_message",
  "label": "Submit message",
  "verb": "write",
  "target": "/guestbook/messages",
  "transport": { "method": "POST" },
  "state_effect": { "response_mode": "page" },
  "input_schema": {
    "type": "object",
    "required": ["message"],
    "properties": {
      "message": { "type": "string" }
    },
    "additionalProperties": false
  }
}
```

`POST` submit actions are sent as JSON by the headless host unless a submitted
value is a `File`, in which case multipart form data is used.

## Read Actions

`verb: "read"` signals that the action refreshes or retrieves state rather than
mutating it.

Read actions often combine well with `GET` and `response_mode: "region"`. The
behavior remains `read` when no region response mode is declared.

## Confirmation

Confirmation policy is projected into operation metadata for UI layers:

- root `actions.security.default_confirmation_policy`
- action-level `security.confirmation_policy`

Action-level policy overrides the root default. The default UI can use
this metadata to ask for confirmation before submitting an action.

The runtime enforces confirmation through action proof when proofing is enabled.
Custom UIs should still show confirmation affordances so users understand why a
submission requires explicit confirmation.
