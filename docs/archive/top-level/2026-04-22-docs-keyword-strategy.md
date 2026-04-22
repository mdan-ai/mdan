# Docs Keyword Strategy

This document records the current docs-side keyword strategy for the MDAN SDK
documentation site.

It is an internal planning document. It should not be treated as public-facing
documentation or included in the docs-site navigation.

## Goal

Use the docs site to strengthen discoverability without turning the content into
generic SEO pages.

The strategy should help the site do three things well:

1. explain what MDAN is
2. capture developer intent for building and integrating apps
3. create a small number of strong comparison and capability entry points

## Current Strengths

The current docs already reinforce a clear canonical vocabulary:

- MDAN
- application surface
- interactive Markdown
- agent app
- skills app
- online skills
- action proof

That vocabulary is already visible across:

- `docs/what-is-mdan.md`
- `docs/understanding-mdan.md`
- `docs/mdan-vs-mcp.md`
- `spec/application-surface.md`
- `spec/surface-contract.md`
- `spec/action-execution.md`

This is good for canonical language and brand consistency.

## Current Gaps

The remaining gap is not a lack of MDAN terminology. The gap is that the docs
do not yet fully cover the phrases developers are likely to search before they
know the MDAN vocabulary.

The main missing query shapes are:

- build an agent app
- AI agent app framework
- interactive Markdown app
- agent-readable app
- shared app for humans and agents
- custom frontend for agent apps
- deploy an agent app
- integrate agent app into existing backend

## Keyword Layers

The docs should intentionally cover four layers of language.

### 1. Canonical MDAN Terms

These terms define the official model and should stay stable:

- MDAN
- MDAN SDK
- MDAN application surface
- MDAN surface contract
- MDAN action proof

### 2. Problem And Intent Terms

These terms reflect what developers are trying to do:

- build an agent app
- build an interactive Markdown app
- build a shared app for humans and agents
- custom frontend for an agent app
- deploy an MDAN app
- integrate MDAN into an existing backend

### 3. Category Terms

These terms help with discovery before users know the protocol name:

- AI agent app framework
- interactive Markdown app framework
- agent-readable app
- shared human and agent UI
- online skills runtime

### 4. Comparison Terms

These terms help users place MDAN in the ecosystem:

- MDAN vs MCP
- MCP complement for interactive apps
- tool-only agent interface vs app surface

## Current Page Map

This section maps the current docs pages to the keyword themes they should
primarily own.

### Core Concept Pages

- `docs/what-is-mdan.md`
  Primary:
  `what is MDAN`, `MDAN framework`, `interactive app for humans and agents`
  Secondary:
  `AI-native app protocol`, `agent-readable app`

- `docs/understanding-mdan.md`
  Primary:
  `how MDAN works`, `application surface model`, `artifacts and actions`
  Secondary:
  `interactive Markdown app model`, `shared app model`

- `docs/mdan-vs-mcp.md`
  Primary:
  `MDAN vs MCP`, `MCP complement`, `interactive pages vs tools`
  Secondary:
  `agent UI vs tool calls`, `when to use MDAN`

### Build And Integration Pages

- `docs/getting-started.md`
  Primary:
  `get started with MDAN`, `start building an agent app`
  Secondary:
  `MDAN quickstart`, `choose an MDAN example`

- `docs/build-your-first-app.md`
  Primary:
  `build an agent app`, `first MDAN app`, `TypeScript agent app tutorial`
  Secondary:
  `build an interactive Markdown app`, `Node agent app tutorial`

- `docs/server-integration.md`
  Primary:
  `integrate MDAN into an existing backend`, `MDAN backend integration`
  Secondary:
  `embed agent app in existing server`, `server-side MDAN integration`

- `docs/deployment-and-production.md`
  Primary:
  `deploy an MDAN app`, `MDAN production deployment`
  Secondary:
  `Node production agent app`, `Bun production agent app`, `SSE deployment`

### Frontend And Runtime Pages

- `docs/custom-rendering.md`
  Primary:
  `custom frontend for MDAN`, `React agent UI`, `Vue agent UI`
  Secondary:
  `custom renderer for agent app`, `frontend escape hatch`

- `docs/application-structure.md`
  Primary:
  `MDAN app architecture`, `agent app structure`
  Secondary:
  `application surface architecture`, `MDAN project layout`

- `docs/developer-paths.md`
  Primary:
  `how to build with MDAN`, `MDAN integration paths`
  Secondary:
  `agent app SDK path`, `custom frontend path`

- `docs/browser-and-headless-runtime.md`
  Primary:
  `browser runtime for MDAN`, `headless MDAN runtime`
  Secondary:
  `server-rendered agent UI`, `MDAN browser shell`

## Recommended Metadata Adjustments

These are the highest-value updates to existing page titles, descriptions, and
intro paragraphs.

### High Priority

- `docs/what-is-mdan.md`
  Add stronger wording around:
  `framework`, `interactive apps`, and `humans and agents`

- `docs/build-your-first-app.md`
  Explicitly target:
  `build an agent app` and `TypeScript tutorial`

- `docs/custom-rendering.md`
  Make `React`, `Vue`, and `custom frontend for agent apps` more visible in the
  title, description, or opening section

- `docs/deployment-and-production.md`
  Make `deploy an MDAN app` explicit in the first paragraph

### Medium Priority

- `docs/getting-started.md`
- `docs/application-structure.md`
- `docs/developer-paths.md`
- `docs/server-integration.md`

These pages are already strong structurally, but can carry more search-intent
language without changing their scope.

## Candidate New Pages

The current site does not need many new pages. Two additions would likely cover
most remaining keyword gaps.

### 1. `docs/ai-agent-apps.md`

Purpose:

- create an external-language entry point for developers who do not know MDAN
- explain when MDAN is useful for interactive agent apps

Keyword focus:

- AI agent app framework
- build an agent app
- shared app for humans and agents

### 2. `docs/interactive-markdown-apps.md`

Purpose:

- give "interactive Markdown" a dedicated landing page instead of only
  mentioning it across multiple documents
- connect Markdown artifacts, actions, and browser projection in one place

Keyword focus:

- interactive Markdown app
- Markdown actions
- Markdown app framework

## Pages That Should Not Participate In Keyword Capture

These pages can remain in the repository, but they should not shape the public
docs keyword strategy:

- `docs/legacy-docs-migration-inventory.md`
- `docs/JSON-MIGRATION-CHECKLIST.md`
- `docs/archive/**`

Internal planning pages should be archived rather than left at the top level of
`docs/`.

## Recommended Next Step

Do the work in this order:

1. tighten frontmatter titles and descriptions for the highest-value existing
   docs pages
2. revise the opening paragraphs of those pages to include clearer
   search-intent language
3. add one or two new keyword-entry pages only after the current pages are
   better aligned

This keeps the docs strategy focused on stronger entry points, rather than
adding a large number of thin pages.
