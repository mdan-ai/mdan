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
      { route: "/build-your-first-app", label: "Build Your First App" },
      { route: "/glossary", label: "Glossary" },
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
      { route: "/deployment-and-production", label: "Deployment And Production" },
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
      { route: "/reference/agent-markdown-surface-contract", label: "Agent Surface Contract" },
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
      { route: "/spec/application-surface", label: "Application Surface Spec" },
      { route: "/spec/surface-contract", label: "Surface Contract" },
      { route: "/spec/action-execution", label: "Action Execution" },
      { route: "/spec/action-proof", label: "Action Proof" },
      { route: "/spec/agent-content", label: "Agent Content" },
      { route: "/spec/state-and-identity", label: "State And Identity" },
      { route: "/spec/representations", label: "Representations" },
      { route: "/spec/versioning-and-conformance", label: "Versioning And Conformance" },
      { route: "/spec/application-surface-zh", label: "Application Surface Spec (ZH)" }
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
  { route: "/build-your-first-app", sourcePath: "docs/build-your-first-app.md" },
  { route: "/glossary", sourcePath: "docs/glossary.md" },
  { route: "/what-is-mdan", sourcePath: "docs/what-is-mdan.md" },
  { route: "/mdan-vs-mcp", sourcePath: "docs/mdan-vs-mcp.md" },
  { route: "/understanding-mdan", sourcePath: "docs/understanding-mdan.md" },
  { route: "/examples", sourcePath: "docs/examples.md" },
  { route: "/developer-paths", sourcePath: "docs/developer-paths.md" },
  { route: "/application-structure", sourcePath: "docs/application-structure.md" },
  { route: "/server-integration", sourcePath: "docs/server-integration.md" },
  { route: "/deployment-and-production", sourcePath: "docs/deployment-and-production.md" },
  { route: "/custom-rendering", sourcePath: "docs/custom-rendering.md" },
  { route: "/guides/runtime-contract", sourcePath: "docs/runtime-contract.md" },
  { route: "/guides/browser-and-headless-runtime", sourcePath: "docs/browser-and-headless-runtime.md" },
  { route: "/guides/inputs-and-assets", sourcePath: "docs/inputs-and-assets.md" },
  { route: "/guides/sessions", sourcePath: "docs/sessions.md" },
  { route: "/guides/errors", sourcePath: "docs/errors.md" },
  { route: "/guides/streaming", sourcePath: "docs/streaming.md" },
  { route: "/guides/agent-content", sourcePath: "docs/agent-content.md" },
  { route: "/guides/action-proof-security", sourcePath: "docs/action-proof-security.md" },
  { route: "/reference/public-api", sourcePath: "docs/public-api.md" },
  { route: "/api-reference", sourcePath: "docs/api-reference.md" },
  { route: "/reference/server-adapters", sourcePath: "docs/server-adapters.md" },
  { route: "/reference/ui-action-semantics", sourcePath: "docs/ui-action-semantics.md" },
  { route: "/reference/agent-eval", sourcePath: "docs/agent-eval.md" },
  { route: "/reference/agent-markdown-surface-contract", sourcePath: "docs/agent-surface-contract.md" },
  { route: "/reference/parity-check", sourcePath: "docs/parity-check.md" },
  { route: "/reference/test-baseline", sourcePath: "docs/test-baseline.md" },
  { route: "/reference/changelog", sourcePath: "CHANGELOG.md" },
  { route: "/examples/starter", sourcePath: "examples/starter/README.md" },
  { route: "/examples/docs-starter", sourcePath: "examples/docs-starter/README.md" },
  { route: "/examples/auth-guestbook", sourcePath: "examples/auth-guestbook/README.md" },
  { route: "/examples/weather-markdown", sourcePath: "demo/weather-markdown/README.md" },
  { route: "/spec", sourcePath: "spec/index.md" },
  { route: "/spec/application-surface", sourcePath: "spec/application-surface.md" },
  { route: "/spec/surface-contract", sourcePath: "spec/surface-contract.md" },
  { route: "/spec/action-execution", sourcePath: "spec/action-execution.md" },
  { route: "/spec/action-proof", sourcePath: "spec/action-proof.md" },
  { route: "/spec/agent-content", sourcePath: "spec/agent-content.md" },
  { route: "/spec/state-and-identity", sourcePath: "spec/state-and-identity.md" },
  { route: "/spec/representations", sourcePath: "spec/representations.md" },
  { route: "/spec/versioning-and-conformance", sourcePath: "spec/versioning-and-conformance.md" },
  { route: "/spec/application-surface-zh", sourcePath: "spec/application-surface.zh.md" },
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
