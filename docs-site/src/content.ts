import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";

export interface DocsNavItem {
  route: string;
  label: string;
}

export interface DocsNavSection {
  title: string;
  items: DocsNavItem[];
}

export interface DocsPageDefinition {
  route: string;
  sourcePath: string;
}

export const docsNav: DocsNavSection[] = [
  {
    title: "Overview",
    items: [
      { route: "/", label: "Home" },
      { route: "/getting-started", label: "Getting Started" },
      { route: "/what-is-mdan", label: "What is MDAN?" },
      { route: "/mdan-vs-mcp", label: "MDAN vs MCP" },
      { route: "/understanding-mdan", label: "Understanding MDAN" },
      { route: "/examples", label: "Examples" }
    ]
  },
  {
    title: "Guides",
    items: [
      { route: "/developer-paths", label: "Developer Paths" },
      { route: "/application-structure", label: "Application Structure" },
      { route: "/server-integration", label: "Server Integration" },
      { route: "/custom-rendering", label: "Custom Rendering" },
      { route: "/guides/runtime-contract", label: "Runtime Contract" },
      { route: "/guides/browser-and-headless-runtime", label: "Browser And Headless Runtime" },
      { route: "/guides/inputs-and-assets", label: "Inputs And Assets" },
      { route: "/guides/sessions", label: "Sessions" },
      { route: "/guides/errors", label: "Errors" },
      { route: "/guides/streaming", label: "Streaming" },
      { route: "/guides/agent-content", label: "Agent Content" },
      { route: "/guides/action-proof-security", label: "Action Proof Security" }
    ]
  },
  {
    title: "Reference",
    items: [
      { route: "/reference/public-api", label: "Public API" },
      { route: "/api-reference", label: "API Reference" },
      { route: "/reference/server-adapters", label: "Server Adapters" },
      { route: "/reference/ui-action-semantics", label: "UI Action Semantics" },
      { route: "/reference/agent-eval", label: "Agent Evaluation" },
      { route: "/reference/agent-markdown-artifact-contract", label: "Agent Artifact Contract" },
      { route: "/reference/parity-check", label: "Parity Check" },
      { route: "/reference/test-baseline", label: "Test Baseline" },
      { route: "/reference/changelog", label: "Changelog" }
    ]
  },
  {
    title: "Examples",
    items: [
      { route: "/examples/starter", label: "Starter" },
      { route: "/examples/docs-starter", label: "Docs Starter" },
      { route: "/examples/auth-guestbook", label: "Auth Guestbook" },
      { route: "/examples/weather-markdown", label: "Weather Markdown" }
    ]
  },
  {
    title: "Spec",
    items: [
      { route: "/spec", label: "Spec Overview" },
      { route: "/spec/application-surface-zh", label: "Application Surface Spec (ZH)" },
      { route: "/spec/legacy-surface-actions-contract", label: "Legacy Surface Actions Contract" }
    ]
  },
  {
    title: "Contributing",
    items: [
      { route: "/contributing", label: "Contributing" },
      { route: "/architecture", label: "Architecture" }
    ]
  }
];

export const docsPages: DocsPageDefinition[] = [
  { route: "/", sourcePath: "docs/index.md" },
  { route: "/getting-started", sourcePath: "docs/getting-started.md" },
  { route: "/what-is-mdan", sourcePath: "docs/what-is-mdan.md" },
  { route: "/mdan-vs-mcp", sourcePath: "docs/mdan-vs-mcp.md" },
  { route: "/understanding-mdan", sourcePath: "docs/understanding-mdan.md" },
  { route: "/examples", sourcePath: "docs/examples.md" },
  { route: "/developer-paths", sourcePath: "docs/developer-paths.md" },
  { route: "/application-structure", sourcePath: "docs/application-structure.md" },
  { route: "/server-integration", sourcePath: "docs/server-integration.md" },
  { route: "/custom-rendering", sourcePath: "docs/custom-rendering.md" },
  { route: "/guides/runtime-contract", sourcePath: "docs/RUNTIME-CONTRACT.md" },
  { route: "/guides/browser-and-headless-runtime", sourcePath: "docs/BROWSER-AND-HEADLESS-RUNTIME.md" },
  { route: "/guides/inputs-and-assets", sourcePath: "docs/INPUTS-AND-ASSETS.md" },
  { route: "/guides/sessions", sourcePath: "docs/SESSIONS.md" },
  { route: "/guides/errors", sourcePath: "docs/ERRORS.md" },
  { route: "/guides/streaming", sourcePath: "docs/STREAMING.md" },
  { route: "/guides/agent-content", sourcePath: "docs/AGENT-CONTENT.md" },
  { route: "/guides/action-proof-security", sourcePath: "docs/ACTION-PROOF-SECURITY.md" },
  { route: "/reference/public-api", sourcePath: "docs/PUBLIC-API.md" },
  { route: "/api-reference", sourcePath: "docs/api-reference.md" },
  { route: "/reference/server-adapters", sourcePath: "docs/SERVER-ADAPTERS.md" },
  { route: "/reference/ui-action-semantics", sourcePath: "docs/UI-ACTION-SEMANTICS.md" },
  { route: "/reference/agent-eval", sourcePath: "docs/AGENT-EVAL.md" },
  { route: "/reference/agent-markdown-artifact-contract", sourcePath: "docs/2026-04-12-agent-consumption-contract.md" },
  { route: "/reference/parity-check", sourcePath: "docs/PARITY-CHECK.md" },
  { route: "/reference/test-baseline", sourcePath: "docs/TEST-BASELINE.md" },
  { route: "/reference/changelog", sourcePath: "CHANGELOG.md" },
  { route: "/examples/starter", sourcePath: "examples/starter/README.md" },
  { route: "/examples/docs-starter", sourcePath: "examples/docs-starter/README.md" },
  { route: "/examples/auth-guestbook", sourcePath: "examples/auth-guestbook/README.md" },
  { route: "/examples/weather-markdown", sourcePath: "demo/weather-markdown/README.md" },
  { route: "/spec", sourcePath: "spec/index.md" },
  { route: "/spec/application-surface-zh", sourcePath: "spec/application-surface.zh.md" },
  { route: "/spec/legacy-surface-actions-contract", sourcePath: "spec/legacy-surface-actions-contract.md" },
  { route: "/contributing", sourcePath: "CONTRIBUTING.md" },
  { route: "/architecture", sourcePath: "ARCHITECTURE.md" }
];

export async function assertDocsPagesExist(repoRoot: string): Promise<void> {
  for (const page of docsPages) {
    await access(join(repoRoot, page.sourcePath), constants.R_OK);
  }
}

export async function loadDocsPageSource(repoRoot: string, route: string): Promise<string | null> {
  const page = docsPages.find((entry) => entry.route === route);
  if (!page) {
    return null;
  }
  return readFile(join(repoRoot, page.sourcePath), "utf8");
}

export function listDocsRoutes(): string[] {
  return docsPages.map((page) => page.route);
}
