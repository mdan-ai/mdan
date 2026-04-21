---
title: Server Integration
description: Integrate MDAN into an existing backend without rebuilding runtime behavior yourself.
---

# Server Integration

This page is for the case where you already have a backend and want to plug
MDAN into it without rebuilding runtime behavior yourself.

The short version is: keep the transport adaptation thin, then let the runtime
handle the real work.

## Integration Boundary

Keep the boundary clear:

- the framework layer adapts transport details
- the MDAN runtime handles routing, negotiation, body semantics, and action execution

In practice, that means adapting requests and responses to the current runtime
or host entry points instead of re-implementing MDAN logic in middleware or
controllers.

## The Preferred Path

When possible, prefer the provided host adapters:

- `@mdanai/sdk/server/node`
- `@mdanai/sdk/server/bun`

They already handle important concerns such as:

- body normalization
- cookies
- browser form bridging
- static files
- browser shell requests

If those adapters fit your environment, use them rather than rebuilding their
behavior.

## When You Need A Custom Adapter

You may still want a custom integration when:

- you already have an established server framework
- you need to mount MDAN under a larger app
- you need tighter control over request lifecycle, auth, or deployment shape

In that setup, keep your adapter thin:

- normalize method, URL, headers, cookies, and body once
- call the runtime or host integration boundary once
- pass status, headers, and body back through without reinterpretation

## HTTP Semantics You Need To Preserve

Your integration layer must preserve the runtime contract:

- page reads negotiate Markdown or HTML through `Accept`
- action requests may be `GET`, JSON `POST`, or form-adapted submissions
- malformed bodies should still fail with the correct status behavior
- `set-cookie` headers must be preserved
- streaming responses should not be silently buffered into another shape

## Adapter Checklist

- the request URL should be absolute
- headers should be normalized once
- cookies should be passed through intact
- response headers should not be overwritten casually
- streaming results should stay streaming

## Common Pitfalls

- duplicating routing rules outside the runtime
- transforming returned Markdown into another bespoke format mid-flight
- dropping `set-cookie` on the way out
- buffering stream responses into JSON or strings by accident

## Related Docs

- [Runtime Contract](/guides/runtime-contract)
- [Server Adapters](/reference/server-adapters)
- [Application Structure](/application-structure)
