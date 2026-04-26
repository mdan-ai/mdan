---
title: MDAN Application Surface Spec
description: English overview specification for the MDAN application surface model.
---

# MDAN Application Surface Spec

- Status: Draft
- Version: vNext
- Language: English

## 1. Introduction

This specification defines the normative semantics of the MDAN application
surface model.

Its purpose is to define an implementation-independent surface model so that
different implementations can interoperate around the same content semantics,
action semantics, state semantics, representation semantics, and safety
semantics.

This specification defines:

- the content document model
- the actions contract model
- state-bound surface semantics
- action execution and state transition outcomes
- representation and projection consistency
- trust, confirmation, safety, and conformance requirements

It does not define:

- any SDK API
- any language-specific framework model
- any specific host or runtime implementation
- any specific UI library or visual design
- tutorial-style integration guidance

## 2. Normative Language

The keywords `MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, and `MAY` are to be
interpreted with their normative meaning.

If two rules appear to conflict, the following interpretation order applies:

1. more specific rules override more general ones
2. stricter safety constraints override looser ones
3. executable truth in the actions contract overrides descriptive wording in
   content
4. this specification overrides implementation guides and examples

## 3. Core Terms

### 3.1 Content Document

A content document is the shared readable text carrier for humans and agents.
It defines readable content, structured regions, and action references, but it
does not by itself define full executable truth.

### 3.2 Actions Contract

An actions contract is the machine-interpretable execution contract for the
current state. It defines state identity, blocks, actions, input constraints,
and state effects.

### 3.3 Surface

A surface is a runtime surface bound to a specific state. It is determined by
content, actions, and state identity together, and it may be projected into
different representations.

### 3.4 Action Surface

An action surface is a surface that carries executable action semantics in
addition to readable content semantics.

### 3.5 State

State is the identity boundary of an application at a point in time. At minimum
it is identified by `app_id`, `state_id`, and `state_version`.

### 3.6 Region

A region is a named part of a surface that may be identified and updated
independently. Region updates and page replacements must remain distinct.

### 3.7 Representation

A representation is a deliverable form of the same state-bound surface.
Different representations may serve different consumers, but they must not
change the normative truth of the state.

### 3.8 Trust

Trust is the declared interpretation boundary for a content region. More
conservative trust interpretation takes precedence over more permissive
interpretation.

### 3.9 Conformance

Conformance means that an implementation satisfies the minimum structural,
identity, execution, safety, and result-classification requirements defined by
this specification.

## 4. Overall Model

A conforming MDAN application surface model consists of:

- a content document
- an actions contract
- a state-bound surface

The following invariants apply:

- the content document carries shared readable semantics
- the actions contract carries executable truth
- the surface is bound to an explicit state
- conflicting state identities MUST NOT be silently merged
- representation differences MUST NOT change surface truth

These objects relate to one another. They do not replace one another.

## 5. Content Document Model

### 5.1 General Requirements

A content document MUST be a textual content carrier.

It MAY contain:

- ordinary Markdown content
- structured block regions

It MUST NOT by itself:

- define the full execution contract
- replace state identity fields
- override action input constraints

### 5.2 Block Regions

A content document MAY declare named block regions.

Interoperable form:

```md
::: block{id="main" actions="refresh_main,submit_message" trust="untrusted"}
```

Requirements:

- `id` MUST exist and MUST be non-empty
- block ids MUST be unique within the same content document
- `actions`, when present, MUST be a comma-separated list of action ids
- `trust`, when present, MUST be one of `trusted`, `untrusted`, or `unknown`

Each referenced action id in a block MUST exist in the actions contract of the
same state.

### 5.3 Semantic Slots

Semantic slots are optional structured content sections that can stabilize
shared prompt and interaction structure.

They are not required for core surface conformance. The executable contract
remains the action/state JSON, not the presence of specific prose headings.

Recognized slot names are:

- `Purpose`
- `Context`
- `Rules`
- `Result`
- `Examples`
- `Views`
- `Handoff`

If an implementation or profile explicitly claims semantic-slot validation
support:

- slot headings MUST be recognizable
- duplicate slot names MUST be rejected
- empty slot bodies MUST be rejected

### 5.4 Agent Blocks

Agent blocks carry agent-only content.

Interoperable form:

```md
<!-- agent:begin id="login_hint" -->
...agent-only Markdown...
<!-- agent:end -->
```

If an implementation recognizes agent block semantics:

- every `agent:begin` MUST be matched by `agent:end`
- each agent block MUST have a non-empty unique `id`
- empty agent block bodies MUST be rejected
- nested agent blocks MUST be rejected

### 5.5 Content Consistency

Structured action references inside content MUST reference declared actions.

If content and the actions contract disagree, content MUST NOT be interpreted as
overriding the actions contract.

## 6. Actions Contract Model

### 6.1 General Shape

An actions contract MUST be structurally recognizable.

At minimum it MUST contain:

- `actions`

It MAY additionally contain:

- `app_id`
- `state_id`
- `state_version`
- `blocks`
- `security`

### 6.2 State Identity Fields

When present:

- `app_id` MUST be a non-empty string
- `state_id` MUST be a non-empty string
- `state_version` MUST be numeric

Content, actions, and derived surfaces from the same state MUST NOT contradict
one another on state identity.

### 6.3 Region Declarations

`blocks` MAY declare the named regions present in the current state.

If present:

- it MUST be an object keyed by block id
- each region id MUST be non-empty
- each referenced action id in `blocks.<id>.actions`, when present, MUST exist
  in the top-level `actions` object

### 6.4 Actions Collection

`actions` MUST be an object keyed by action id.

Every action entry MUST have at least:

- `target`

Action ids are carried by the object keys and MUST be unique within the same
state.

## 7. Surface Model

### 7.1 Surface Definition

A surface is the result of binding content, actions, and state identity
together.

A conforming surface MUST provide:

- explicit state identity
- readable content semantics
- executable action semantics
- an outcome boundary consistent with state effects

### 7.2 Surface Result Types

Recognized result types are:

- `page`
- `region`
- `stream`

They MUST remain semantically distinct:

- `page` replaces a full page surface
- `region` updates one or more named regions
- `stream` delivers incremental results over time

Implementations MUST NOT silently collapse these result classes into one.

### 7.3 Additional Surface Metadata

A surface MAY carry additional metadata as long as it does not:

- override state identity
- override executable truth
- change the result class

If region mappings are declared:

- each key MUST be a non-empty region name
- each value MUST be the content string for that region in the current state

## 8. Action Execution And State Transitions

### 8.1 Action Execution

Action execution MUST be based on actions declared in the current state.

Consumers:

- MUST choose actions by `id`
- MUST respect target and method semantics
- MUST respect input constraints
- MUST NOT invent actions absent from the declared `actions` object

### 8.2 Execution Outcomes

Successful action execution MAY produce:

- a new page surface
- a region-oriented surface update
- a stream result

The result MUST preserve consistency across state identity, actions, and
readable content.

### 8.3 Failure Outcomes

If an action cannot be executed:

- the result SHOULD remain readable where possible
- the result MUST NOT imply forbidden execution succeeded
- the result MAY change which actions are associated with blocks in the next
  returned state

## 9. Representations And Delivery

### 9.1 Representation Categories

Recognized representation categories are:

- Markdown surface representation
- HTML
- Event Stream

Other representations MAY exist, but they MUST continue to point to the same
surface truth.

### 9.2 Representation Consistency

Representations MUST NOT change:

- state identity
- action sets
- safety constraints
- page versus region semantics

The Markdown surface representation carries the shared readable surface. Other
representations are projections of the same state.

### 9.3 Negotiation

If representation negotiation exists, an implementation MUST:

- return the explicitly negotiated representation, or
- explicitly reject an unsupported representation request

It MUST NOT silently substitute a conflicting representation.

## 10. Trust And Safety

### 10.1 Trust Values

Recognized trust values are:

- `trusted`
- `untrusted`
- `unknown`

### 10.2 Safety Boundary

More conservative trust interpretation takes precedence.

Content not explicitly recognized as trusted MUST NOT be used to loosen
structural, execution, or safety requirements.

## 11. Conformance

A conforming implementation MUST be able to:

- represent content documents
- represent actions contracts
- represent state identity
- distinguish page, region, and stream outcomes
- preserve semantics across representations
- produce determinable trust and safety behavior
