# MDAN

MDAN is a Markdown-first framework for building apps that humans and AI agents can both use.

It keeps content, operations, and follow-up interaction in the same page model.

This repository contains the reference SDK, the project starter, runnable examples, and the docs site.

MDAN officially supports Node and Bun through shared server primitives plus runtime-specific host adapters.

## Why MDAN

Markdown is easy to read and easy to generate, but plain Markdown is weak at expressing interaction.

Once a page needs inputs, actions, partial updates, or navigation, that structure usually gets pushed into templates, frontend state, and custom API glue.

MDAN keeps that interaction in the page source, while still keeping the page readable for humans and AI agents.

The same Markdown source can carry:

- content for humans to read
- state and task context for AI agents to interpret
- explicit interaction structure for both sides to continue from

## Packages

- `@mdanai/sdk`: the reference SDK for building apps with MDAN
- `create-mdan`: the fastest way to start a minimal MDAN app

## Quick Start

If you want to try the code in this repository:

```bash
npm install
npm run build
cd examples/starter
npm start
```

You can still use Bun for install and build work:

```bash
bun install
bun run build
cd examples/starter
npm start
```

The in-repo examples keep their current Node host shells.

If you want to start a new app on Node:

```bash
npm create mdan@latest agent-app
cd agent-app
npm install
npm start
```

If you want to start a new app on Bun:

```bash
bunx create-mdan agent-app
cd agent-app
bun install
bun start
```

You can also override the starter runtime explicitly:

```bash
npm create mdan@latest agent-app -- --runtime bun
bunx create-mdan agent-app --runtime node
```

## Examples

- Starter: [examples/starter](/Users/hencoo/projects/mdsn/examples/starter)
- Vue Starter: [examples/vue-starter](/Users/hencoo/projects/mdsn/examples/vue-starter)
- React Starter: [examples/react-starter](/Users/hencoo/projects/mdsn/examples/react-starter)
- Express Starter: [examples/express-starter](/Users/hencoo/projects/mdsn/examples/express-starter)
- Docs Starter: [examples/docs-starter](/Users/hencoo/projects/mdsn/examples/docs-starter)

## Docs

- Getting Started: [docs/getting-started.md](/Users/hencoo/projects/mdsn/docs/getting-started.md)
- Understanding MDAN: [docs/understanding-mdan.md](/Users/hencoo/projects/mdsn/docs/understanding-mdan.md)
- Application Structure: [docs/application-structure.md](/Users/hencoo/projects/mdsn/docs/application-structure.md)
- Custom Rendering: [docs/custom-rendering.md](/Users/hencoo/projects/mdsn/docs/custom-rendering.md)
- SDK Overview: [docs/sdk.md](/Users/hencoo/projects/mdsn/docs/sdk.md)
- Examples: [docs/examples.md](/Users/hencoo/projects/mdsn/docs/examples.md)
