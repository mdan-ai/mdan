# Agent Content

MDAN pages are read by humans and agents. The SDK provides two content features
to keep that shared surface structured without leaking agent-only instructions
into human-visible HTML.

## Semantic Slots

Semantic slots are Markdown H2 sections with canonical names:

- `## Purpose`
- `## Context`
- `## Rules`
- `## Result`
- `## Views`
- `## Handoff`

`Purpose`, `Context`, `Rules`, and `Result` are the required core slots for page
validation. `Views` and `Handoff` are accepted optional slots that let an entry
describe shared rendering expectations and follow-on usage without introducing a
separate slot family.

By default, semantic slots are just content. Hosts can enable validation:

```ts
const server = createMdanServer({
  semanticSlots: true
});
```

`semanticSlots: true` enables both page and block checks:

- page `content` must include `Purpose`, `Context`, `Rules`, and `Result`
- each returned block region must include `Context` and `Result`

You can enable the checks independently:

```ts
createMdanServer({
  semanticSlots: {
    requireOnPage: true,
    requireOnBlock: false
  }
});
```

Slot validation requires H2 headings, rejects duplicates, and rejects empty
slots.

## Untrusted Blocks

Content inside Markdown blocks marked `trust="untrusted"` is masked before
semantic-slot and agent-block validation. This lets apps display user-provided
Markdown without letting that content satisfy or break host-authored prompt
structure.

```md
::: block{id="comments" trust="untrusted"}
User-provided Markdown goes here.
:::
```

## Agent Blocks

Agent blocks are HTML comments that carry agent-only instructions:

```md
<!-- agent:begin id="login_hint" -->
## Context
Use this block when deciding whether the user needs to sign in.

## Result
Submit the login action only when credentials are available.
<!-- agent:end -->
```

The SDK validates agent blocks on every returned surface:

- every `agent:begin` must have one `agent:end`
- each block must have a non-empty unique `id`
- block bodies must not be empty
- agent blocks may not nest

Human-visible projections strip agent blocks:

- browser shell snapshot HTML
- default elements rendering
- Markdown rendering helpers that call `stripAgentBlocks`

The primary Markdown artifact still includes the original Markdown content so
agent-capable clients can read the instructions directly. Legacy JSON
compatibility surfaces continue to carry that same content when compatibility
transport is needed.

## Recommended Pattern

Use semantic slots for page-level structure that both humans and agents can see.
Use agent blocks for hidden guidance that should not render in the browser UI.

For example:

```md
# Guestbook

## Purpose
Let signed-in users read and post guestbook messages.

## Context
The current session and message list are reflected in the blocks below.

## Rules
Only submit actions declared in the current surface.

## Result
A successful post appears at the top of the message list.

::: block{id="composer" actions="submit_message"}
Add a message.

<!-- agent:begin id="composer_prompt" -->
## Context
Use this block to submit a new message while signed in.

## Result
A valid submission adds a new message to the top of the feed.
<!-- agent:end -->
:::
```
