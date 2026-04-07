# MDAN

One page for humans and agents.

MDAN (Markdown Action Notation) is a shared notation for interactive pages that stay readable and actionable for both humans and agents, from the same source, across any interface.

Same page. Same actions. Same experience.

This repository contains the MDAN spec, the TypeScript reference SDK, the project starter, runnable examples, and the docs site.

MDAN officially supports Node and Bun through shared server primitives plus runtime-specific host adapters.

## Why MDAN

Markdown is easy to read and easy to generate, but plain Markdown is weak at expressing interaction.

Once a page needs inputs, actions, partial updates, or navigation, that structure usually gets pushed into templates, frontend state, and custom API glue.

MDAN keeps that interaction in the page source, while still keeping the same page readable and actionable for both humans and agents.

The same Markdown source can carry:

- content for humans to read
- state and task context for AI agents to interpret
- explicit interaction structure for both sides to continue from

## Packages

- `@mdanai/sdk`: the reference SDK for building apps with MDAN
- `create-mdan`: the fastest way to start a minimal MDAN app

## Repository Map

- `spec/`: the canonical MDAN spec
  `spec/v1.md` is the public versioned entry, `spec/spec.md` is the complete specification, and `spec/browser-host.md` defines browser-host expectations outside the core spec boundary
- `sdk/`: the TypeScript reference implementation
- `docs/` and `docs-site/`: developer-facing explanations and the docs app
- `examples/` and `demo/`: runnable adoption examples
- `create-mdan/`: the starter scaffold

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

- Starter: [examples/starter](./examples/starter)
- Vue Starter: [examples/vue-starter](./examples/vue-starter)
- React Starter: [examples/react-starter](./examples/react-starter)
- Express Starter: [examples/express-starter](./examples/express-starter)
- Docs Starter: [examples/docs-starter](./examples/docs-starter)

## Docs

- Getting Started: [docs/getting-started.md](./docs/getting-started.md)
- Spec v1: [spec/v1.md](./spec/v1.md)
- Full Spec: [spec/spec.md](./spec/spec.md)
- Browser Host Profile: [spec/browser-host.md](./spec/browser-host.md)
- Understanding MDAN: [docs/understanding-mdan.md](./docs/understanding-mdan.md)
- Application Structure: [docs/application-structure.md](./docs/application-structure.md)
- Custom Rendering: [docs/custom-rendering.md](./docs/custom-rendering.md)
- SDK Overview: [docs/sdk.md](./docs/sdk.md)
- Examples: [docs/examples.md](./docs/examples.md)
