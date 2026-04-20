# @mdanai/sdk

`@mdanai/sdk` is the reference SDK for building apps with MDAN.

It officially supports Node and Bun through a shared server runtime plus runtime-specific host adapters.

MDAN is a Markdown-first application protocol and runtime for shared human and agent interaction. Markdown carries the canonical artifact, HTML is its browser projection, and structured action contracts make the same artifact interactive and executable.

With MDAN, the page is not only presentation. It is also shared working context: readable by humans, consumable by agents, and structured enough for both sides to continue from the same surface.

`@mdanai/sdk` gives you the parser, server runtime, shared surface runtime, and default UI for building with that model.

The name MDAN originally came from "Markdown Action Notation", but the current SDK is positioned around a broader Markdown-first application surface model.

## Why MDAN

Plain Markdown is good for content, but weak at expressing interaction.

Once a page needs inputs, actions, partial updates, or navigation, that structure usually gets pushed into templates, frontend state, and custom API glue.

MDAN makes that interaction layer explicit while keeping the page source readable for humans, AI agents, and agentic systems.

In MDAN, page content is not only presentation. It is also shared prompt context for AI agents.

The same Markdown source can carry:

- content for humans to read
- state and task context for AI agents to interpret
- explicit interaction structure for both sides to continue from

The default server runtime now centers `text/markdown` as the canonical page representation and `text/html` as the browser projection. A legacy JSON surface bridge still exists internally and can be exposed for compatibility where needed. Server hosts resolve `auto` GET dependencies before returning results, so agents and browsers observe the same final state without letting auto bypass action proof for external POST actions.

## Use Cases

- skills apps with guided inputs and step-by-step actions for non-technical users
- agent apps that agents can read, enter, and continue over HTTP
- interactive docs, runbooks, and internal tools with embedded actions
- shared pages where humans and agents work from the same content and next-step actions
- agentic workflows where the server returns both updated results and the next actions to take
- custom hosted interfaces built with React, Vue, or your own server stack

## Surface Model

The current SDK is positioned around an artifact-first protocol:

- Markdown is the canonical artifact for page reads
- HTML is the human projection of that same artifact
- executable MDAN state can ride inside a fenced `mdan` block in the Markdown document
- a legacy JSON surface bridge still exists internally for compatibility and adapter paths

Today, page handlers may still return the legacy JSON surface envelope and the SDK will project it into a Markdown artifact. That bridge is transitional. The long-term direction is artifact-native handlers and Markdown-hosted action declarations.

For browser-capable examples and simple apps, server adapters can serve page-level snapshot HTML while keeping the canonical page source in Markdown:

```ts
const host = createHost(server, {
  browserShell: {
    title: "MDAN Starter"
  }
});
```

For a browser document request, the host forwards `Accept: text/html` to the runtime, which renders readable HTML from the current artifact. When hydration is enabled, the shell may embed bootstrap state for the headless runtime. Runtime requests with `Accept: text/markdown` return the canonical page document. `Accept: application/json` remains available only where compatibility handlers or adapters still need it.

For custom or production frontends, prefer importing only `@mdanai/sdk/surface`. That package is the lightweight shared surface runtime and must stay independent of `@mdanai/sdk/ui`, `lit`, and Markdown rendering. The optional `@mdanai/sdk/ui` package provides the default Web Components UI for quick starts and examples.

For local SDK development, examples can use:

```ts
browserShell: {
  title: "MDAN Starter",
  moduleMode: "local-dist"
}
```

In that mode the server adapter serves two browser bundle entry files, `/__mdan/surface.js` and `/__mdan/ui.js`, from the local `dist-browser/` folder. The browser shell uses those bundled workspace artifacts instead of CDN modules, so it does not need to traverse the SDK's internal module graph in the browser. If those files are missing, the browser gets a visible error telling you to run `bun run build`.

The example `dev:*` scripts now do that for you: they run an initial local SDK build, keep both `dist/` and `dist-browser/` updated during development, and start the Bun example server against those local browser bundles.

HTML generation for page requests is driven by `createMdanServer()` from the page contract. Host adapters are responsible for forwarding browser document requests and serving the optional local browser bundles. The public read path is `text/markdown` and `text/html`. `application/json` is now a legacy compatibility transport, not the recommended primary contract.

Prompt structure and agent-only visibility are handled separately in the current runtime:

- `semanticSlots: true` enables both page and block semantic-slot enforcement
- `semanticSlots.requireOnPage` enforces `## Purpose`, `## Context`, `## Rules`, and `## Result` on returned surface `content`
- `semanticSlots.requireOnBlock` enforces `## Context` and `## Result` on returned `view.regions[*]`
- `<!-- agent:begin ... --> ... <!-- agent:end -->` is always treated as agent-only content: it is validated on every returned surface and stripped from human-visible HTML/UI projections

The main baseline test suite now tracks the Markdown artifact path, the adapter bridge, and the browser shell path end to end.

Canonical page artifact:

````md
# Starter App

## Purpose
Basic MDAN starter flow.

## Context
This page shows the current starter message feed and the next available actions.

## Rules
Read the current feed from the returned artifact and submit new messages through the declared action contract.

## Result
The returned artifact should show the current messages and expose the next allowed actions for the main block.

- No messages yet

<!-- mdan:block main -->

```mdan
{
  "app_id": "starter",
  "state_id": "starter:home:1",
  "state_version": 1,
  "blocks": ["main"],
  "actions": [
    {
      "id": "refresh_main",
      "label": "Refresh",
      "verb": "read",
      "transport": { "method": "GET" },
      "target": "/",
      "input_schema": {
        "type": "object",
        "properties": {},
        "additionalProperties": false
      }
    }
  ],
  "allowed_next_actions": ["refresh_main"]
}
```
````

## Quick Start

Default path for a new app:

- use `@mdanai/sdk/server` to define page routes and action handlers
- use `@mdanai/sdk/server/node` or `@mdanai/sdk/server/bun` to host it
- enable `browserShell` if you want the built-in browser UI

Minimal server setup:

```ts
import { createMdanServer } from "@mdanai/sdk/server";
import { createHost } from "@mdanai/sdk/server/bun";

const server = createMdanServer({
  browserShell: {
    title: "MDAN Starter"
  }
});

server.page("/", async () => ({
  frontmatter: {},
  markdown: `# Starter App

## Purpose
Basic artifact-native MDAN starter flow.

## Context
This page shows the current starter message feed and the next available actions.

## Rules
Read the current feed from the returned artifact and submit new messages through the declared action contract.

## Result
The returned artifact should show the current messages and expose the next allowed actions for the main block.

<!-- mdan:block main -->

- No messages yet
`,
  executableContent: JSON.stringify({
    app_id: "starter",
    state_id: "starter:home:1",
    state_version: 1,
    blocks: ["main"],
    actions: [
      {
        id: "refresh_main",
        label: "Refresh",
        verb: "read",
        transport: { method: "GET" },
        target: "/",
        input_schema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      }
    ],
    allowed_next_actions: ["refresh_main"]
  }, null, 2),
  blockContent: {
    main: "- No messages yet"
  },
  blockAnchors: ["main"],
  visibleBlockNames: ["main"],
  blocks: [
    {
      name: "main",
      inputs: [],
      operations: [
        {
          method: "GET",
          name: "refresh_main",
          target: "/",
          inputs: [],
          label: "Refresh",
          verb: "read",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false
          },
          security: {
            confirmationPolicy: "never"
          }
        }
      ]
    }
  ]
}));

export default createHost(server, {
  browserShell: {
    title: "MDAN Starter"
  }
});
```

This is the preferred direction for new code: return the canonical Markdown
artifact directly. The legacy JSON surface envelope is still supported as a
compatibility bridge while older handlers migrate.

Node starter:

```bash
npm create mdan@latest agent-app
cd agent-app
npm install
npm start
```

Bun starter:

```bash
bunx create-mdan agent-app
cd agent-app
bun install
bun start
```

You can also force either runtime with `--runtime node` or `--runtime bun`.

## Recommended Entry Paths

- `server + ui`
  Use this when you want the fastest path to a working browser app with the built-in UI. This is the default recommendation for new users and local prototypes.
- `server + surface`
  Use this when you want MDAN transport/state handling but you will render the UI yourself in React, Vue, or another frontend.
- `server only`
  Use this when you are serving Markdown artifacts to agents, tests, or another client that does not need the bundled browser UI. If needed, the legacy JSON bridge can still be enabled for compatibility during migration.

## Runtime Adapters

Shared server modeling stays on `@mdanai/sdk/server`:

```ts
import { createMdanServer } from "@mdanai/sdk/server";
```

Then choose the host adapter for your runtime:

```ts
import { createHost } from "@mdanai/sdk/server/node";
```

```ts
import { createHost } from "@mdanai/sdk/server/bun";
```

## Field Schema

SDK input modeling is now centered on `FieldSchema`.

- `kind` carries the canonical field semantic: `string`, `number`, `integer`, `boolean`, `enum`, `asset`, `object`, `array`
- `format` refines display/protocol behavior for compatible kinds, for example `password`, `textarea`, or `binary`
- JSON `input_schema` is normalized once in the protocol layer before it reaches server, surface, or ui helpers
- Server handlers receive schema-normalized `inputs` values for JSON action requests: numbers, integers, booleans, objects, and arrays are delivered as native values; `inputsRaw` preserves the submitted shape for compatibility
- Default UI submit payloads are also normalized by `FieldSchema` before the headless host serializes them

This keeps JSON schema mapping, UI rendering, and runtime validation aligned around one field model.

## Asset Inputs

Asset uploads now normalize into serializable asset handles instead of filename strings.

In a server handler:

```ts
server.post("/upload", async ({ inputs, readAsset, openAssetStream }) => {
  const attachment = inputs.attachment;
  const bytes = await readAsset(attachment.id);
  const stream = openAssetStream(attachment.id);

  return {
    content: `# Uploaded\n\n${attachment.name}`,
    actions: { app_id: "demo", state_id: "demo:upload", state_version: 1, blocks: [], actions: [] },
    view: { route_path: "/upload", regions: {} }
  };
});
```

Local assets are stored under `<project>/.mdan/assets/<asset-id>/...` by default. You can override the root and later clean up expired assets through the server exports:

```ts
import { cleanupExpiredAssets, createMdanServer } from "@mdanai/sdk/server";

const server = createMdanServer({
  assets: {
    rootDir: process.cwd(),
    ttlSeconds: 3600
  }
});

await cleanupExpiredAssets({ rootDir: process.cwd() });
```

## Docs

Local SDK implementation guides:

- [Surface And Actions Contract](docs/SURFACE-ACTIONS-CONTRACT.md)
- [Runtime Contract](docs/RUNTIME-CONTRACT.md)
- [Server Host Adapters](docs/SERVER-ADAPTERS.md)
- [Browser And Headless Runtime](docs/BROWSER-AND-HEADLESS-RUNTIME.md)
- [Inputs And Assets](docs/INPUTS-AND-ASSETS.md)
- [Agent Content](docs/AGENT-CONTENT.md)
- [Action Proof Security](docs/ACTION-PROOF-SECURITY.md)
- [Sessions](docs/SESSIONS.md)
- [Error Model And Status Codes](docs/ERRORS.md)
- [UI Action Semantics](docs/UI-ACTION-SEMANTICS.md)
- [Streaming And SSE](docs/STREAMING.md)
- [Public API And Package Boundaries](docs/PUBLIC-API.md)
- [Agent Evaluation Contract](docs/AGENT-EVAL.md)

Reference and product docs:

- [Getting Started](https://docs.mdan.ai/getting-started)
- [Understanding MDAN](https://docs.mdan.ai/understanding-mdan)
- [SDK Overview](https://docs.mdan.ai/sdk)
- [Custom Rendering](https://docs.mdan.ai/custom-rendering)
- [Surface Runtime](https://docs.mdan.ai/web-runtime)
- [API Reference](https://docs.mdan.ai/api-reference)

## Browser Debugging

If you want to inspect raw browser-side MDAN traffic while using the default UI or your own custom renderer, enable debug messages on the headless host:

```ts
import { createHeadlessHost } from "@mdanai/sdk/surface";

const host = createHeadlessHost({
  initialRoute: window.location.pathname + window.location.search,
  debugMessages: true
});
```

When enabled:

- the browser records outgoing and incoming MDAN messages
- each record keeps the raw request body or the adapted Markdown view of the returned artifact
- messages are available at `window.__MDAN_DEBUG__.messages`
- the default `ui` package also shows a small debug drawer in the browser
