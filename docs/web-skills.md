---
title: Web Skills
description: Define web skills as live skill surfaces with readable Markdown and machine interfaces, explain why the concept matters, how it relates to MDAN, and how to build one with the SDK.
---

# Web Skills

Use this page when you want to understand what we mean by `web skills`, why
we use that term, and why it matters to MDAN.

This is a definition page first, not a low-level protocol spec.

## The Short Definition

A web skill is a skill that has been moved out of a purely local execution
context and turned into a live, URL-addressable web surface.

That surface should be:

- readable by humans
- usable by agents
- reachable over the network
- continuable across multiple steps
- backed by a machine interface, not only prose

In the MDAN framing, a web skill is usually best understood as:

- `Markdown`
  a readable shared surface
- `JSON`
  a machine interface for execution, continuation, or integration

## Why Introduce This Concept

The term exists because "skill" by itself is too vague.

In practice, people often use `skill` to mean things like:

- a local prompt package
- a local tool wrapper
- a function call
- a workflow definition
- a chatbot behavior

Those are all useful, but they are not the same thing as a skill that is
available on the web and can be consumed by both people and software.

Once a skill needs to be:

- deployed
- accessed remotely
- inspected in its current state
- continued through declared next steps
- shared across humans, agents, and runtimes

it stops being only a local skill and starts becoming a web skill.

So the point of the term is not to invent jargon for its own sake. The point is
to name a real transition:

- from local capability
- to web-addressable, interactive, shared capability

## Local Skills Vs Web Skills

Local skills are usually:

- invoked inside one local runtime
- hidden behind implementation code
- optimized for one-shot execution
- weak at exposing readable context to humans

Web skills are different.

They need to expose:

- current context
- current state
- readable output
- executable next steps
- a stable integration surface

That is why a local skill often looks like a function, while a web skill
starts looking like an app surface.

## `Markdown + JSON`

This is the simplest way to understand the concept.

### `Markdown`

The Markdown layer is the readable surface.

It gives humans and agents a shared way to see:

- what this skill is for
- what state it is in
- what result it is showing
- what the next meaningful step is

In MDAN, Markdown is the canonical readable surface for that layer.

### `JSON`

The JSON layer is the machine interface.

It answers questions like:

- how can this skill be executed
- how can it be continued
- what structured action or tool interface does it expose
- what input shape does it accept
- what runtime or platform can consume it

This `json` layer is not limited to one protocol.

For a web skill, the machine interface can be:

- MDAN action JSON
- MCP
- OpenAI API tool or response interfaces
- another structured API contract

So when we say `Markdown + JSON`, we do not mean only "Markdown plus one specific
MDAN envelope." We mean:

- a readable human-and-agent surface
- plus a machine-readable execution contract

## Why This Matters To MDAN

MDAN is strongly related to web skills because it is built around the exact
problem web skills create.

A web skill is not just a hidden tool endpoint. It needs a surface.

That surface needs to:

- stay readable
- stay structured
- stay executable
- stay continuable
- work for both browsers and agents

MDAN gives you one way to do that by keeping:

- Markdown as the readable shared surface
- explicit actions as the executable continuation layer
- HTML as a browser projection of that same surface

So MDAN is not the only possible machine interface for a web skill.

But it is a strong model for building web skills because it keeps the
readable layer and the executable layer close together instead of splitting them
into unrelated systems.

## Why This Is Bigger Than "Tool Calling"

Tool calling is one part of the picture, but it is usually too narrow.

A tool call is often:

- one request
- one response
- one hidden machine interface

A web skill is usually richer than that.

It often needs:

- a readable current state
- a visible result surface
- declared next actions
- browser access
- agent access
- multi-step continuation

That is why we use `web skills` instead of collapsing everything into
`tools`.

## How MDAN Fits Into The Model

You can think about the relationship like this:

- `web skills` is the broader concept
- `MDAN` is one strong way to implement that concept

More specifically:

- `web skills` names the shape of the thing
- `MDAN` provides a shared surface model for building it
- the MDAN SDK packages give you a practical TypeScript path to ship it

## What A Minimal Web Skill Needs

At a practical level, a minimal web skill usually needs:

- a readable description of the current skill surface
- a way to show current state or result
- a machine interface for the next step
- a way to continue after the next step

In MDAN, that often becomes:

- a page or route
- Markdown content
- declared actions
- a returned next readable surface

## How To Build One With MDAN

The simplest MDAN path is:

1. define a page-shaped skill surface
2. make the readable Markdown explain the skill's purpose and current state
3. declare the next actions explicitly
4. handle those actions on the server
5. return the next readable surface after each action

That gives you a web skill with:

- a browser-facing HTML view
- an agent-readable Markdown view
- a structured execution layer

## Example Mental Model

Instead of thinking:

- "I wrote a tool"

think:

- "I exposed a live skill surface"

That surface can now be:

- opened in a browser
- read by an agent
- continued through declared actions
- integrated through machine-readable interfaces

That is the shift from local skills to web skills.

## Practical Rule

Use `web skills` when you mean more than a hidden local capability.

Use it when the thing you are building is:

- reachable on the web
- interactive
- stateful enough to continue
- readable enough to inspect
- structured enough to integrate

That is the category MDAN is trying to make easier to build.

## Related Docs

- [What is MDAN?](/what-is-mdan)
- [Quickstart](/quickstart)
- [Examples](/examples)
- [Custom Server](/custom-server)
- [Action JSON](/action-json)
