---
title: Web Skills Relationship
description: Explain how MDAN relates to Web Skills without making Web Skills part of the SDK's core runtime contract.
---

# Web Skills Relationship

MDAN and Web Skills are related, but they are not the same layer.

## Boundary

MDAN is a runtime model and SDK for interactive `Markdown + JSON` surfaces.

The MDAN SDK handles:

- readable Markdown responses
- embedded JSON action/state contracts
- block anchors and runtime regions
- browser and agent consumption from the same surface
- server routing, validation, action proofing, and content negotiation

Web Skills are an authoring and publishing model for URL-addressable skills.

That model belongs in the `mdan.ai` portal/spec project, where it can define:

- entry Markdown authoring rules
- result surface conventions
- discovery metadata
- binding profiles such as MDAN, MCP, OpenAPI, and HTTP JSON
- portal validation and publishing policy

## How MDAN Fits

MDAN can be a strong runtime profile for Web Skills because it already combines:

- a human-readable surface
- an agent-readable surface
- a machine-executable action contract
- a browser projection of the same state

But the Web Skills specification should not require MDAN-specific internals such
as MDAN block anchors, executable fences, or action proof fields.

## Practical Framing

Use this SDK when you need to build or host an MDAN surface.

Use the Web Skills specification when you need to define how a public skill is
written, described, discovered, and compared across runtimes.

In short:

```text
@mdanai/sdk
  Markdown + JSON runtime implementation

Web Skills
  Authoring, result, binding, and publishing specification
```

## Related Docs

- [What is MDAN?](/what-is-mdan)
- [Action JSON](/action-json)
- [Semantic Slots](/semantic-slots)
- [Architecture](/architecture)
