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
    title: "Start Here",
    items: [
      { route: "/what-is-mdan", label: "What is MDAN?" },
      { route: "/quickstart", label: "Quickstart" },
      { route: "/customize-the-starter", label: "Customize The Starter" },
      { route: "/examples", label: "Examples" },
      { route: "/web-skills", label: "Web Skills Relationship" },
      { route: "/troubleshooting", label: "Troubleshooting" }
    ]
  },
  {
    title: "Guides",
    items: [
      { route: "/deep-dive", label: "Deep Dive" },
      { route: "/semantic-slots", label: "Semantic Slots" },
      { route: "/action-json", label: "Action JSON" },
      { route: "/input-schemas", label: "Input Schemas" },
      { route: "/auto-dependencies", label: "Auto Dependencies" },
      { route: "/browser-bootstrap", label: "Browser Bootstrap" },
      { route: "/guides/sessions", label: "Sessions" },
      { route: "/custom-server", label: "Custom Server" },
      { route: "/custom-rendering", label: "Custom Rendering" }
    ]
  },
  {
    title: "Reference",
    items: [
      { route: "/sdk-packages", label: "SDK Packages" },
      { route: "/api-reference", label: "API Reference" },
      { route: "/server-behavior", label: "Server Behavior" },
      { route: "/browser-behavior", label: "Browser Behavior" },
      { route: "/glossary", label: "Glossary" }
    ]
  },
  {
    title: "Spec",
    items: [
      { route: "/spec", label: "Spec Overview" },
      { route: "/spec/application-surface", label: "Application Surface" },
      { route: "/spec/surface-contract", label: "Surface Contract" },
      { route: "/spec/action-execution", label: "Action Execution" },
      { route: "/spec/action-proof", label: "Action Proof" },
      { route: "/spec/error-model", label: "Error Model" }
    ]
  }
];

export const docsPages: DocsPageDefinition[] = [
  { route: "/", sourcePath: "docs/index.md" },
  { route: "/quickstart", sourcePath: "docs/quickstart.md" },
  { route: "/customize-the-starter", sourcePath: "docs/customize-the-starter.md" },
  { route: "/glossary", sourcePath: "docs/glossary.md" },
  { route: "/what-is-mdan", sourcePath: "docs/what-is-mdan.md" },
  { route: "/web-skills", sourcePath: "docs/web-skills.md" },
  { route: "/examples", sourcePath: "docs/examples.md" },
  { route: "/deep-dive", sourcePath: "docs/deep-dive.md" },
  { route: "/semantic-slots", sourcePath: "docs/semantic-slots.md" },
  { route: "/custom-server", sourcePath: "docs/custom-server.md" },
  { route: "/custom-rendering", sourcePath: "docs/custom-rendering.md" },
  { route: "/troubleshooting", sourcePath: "docs/troubleshooting.md" },
  { route: "/server-behavior", sourcePath: "docs/server-behavior.md" },
  { route: "/browser-behavior", sourcePath: "docs/browser-behavior.md" },
  { route: "/routing", sourcePath: "docs/routing.md" },
  { route: "/choose-a-rendering-path", sourcePath: "docs/choose-a-rendering-path.md" },
  { route: "/markdown-rendering", sourcePath: "docs/markdown-rendering.md" },
  { route: "/form-rendering", sourcePath: "docs/form-rendering.md" },
  { route: "/guides/sessions", sourcePath: "docs/sessions.md" },
  { route: "/sdk-packages", sourcePath: "docs/sdk-packages.md" },
  { route: "/api-reference", sourcePath: "docs/api-reference.md" },
  { route: "/auto-dependencies", sourcePath: "docs/auto-dependencies.md" },
  { route: "/browser-bootstrap", sourcePath: "docs/browser-bootstrap.md" },
  { route: "/action-json", sourcePath: "docs/action-json.md" },
  { route: "/input-schemas", sourcePath: "docs/input-schemas.md" },
  { route: "/reference/server-adapters", sourcePath: "docs/server-adapters.md" },
  { route: "/reference/changelog", sourcePath: "CHANGELOG.md" },
  { route: "/examples/starter", sourcePath: "examples/starter/README.md" },
  { route: "/examples/docs-starter", sourcePath: "examples/docs-starter/README.md" },
  { route: "/examples/auth-guestbook", sourcePath: "examples/auth-guestbook/README.md" },
  { route: "/examples/form-customization", sourcePath: "examples/form-customization/README.md" },
  { route: "/examples/weather-markdown", sourcePath: "demo/weather-markdown/README.md" },
  { route: "/spec", sourcePath: "spec/index.md" },
  { route: "/spec/application-surface", sourcePath: "spec/application-surface.md" },
  { route: "/spec/action-json-fields", sourcePath: "spec/action-json-fields.md" },
  { route: "/spec/surface-contract", sourcePath: "spec/surface-contract.md" },
  { route: "/spec/action-execution", sourcePath: "spec/action-execution.md" },
  { route: "/spec/action-envelope-validation-profile", sourcePath: "spec/action-envelope-validation-profile.md" },
  { route: "/spec/error-model", sourcePath: "spec/error-model.md" },
  { route: "/spec/input-and-schema", sourcePath: "spec/input-and-schema.md" },
  { route: "/spec/action-proof", sourcePath: "spec/action-proof.md" },
  { route: "/spec/agent-content", sourcePath: "spec/agent-content.md" },
  { route: "/spec/state-and-identity", sourcePath: "spec/state-and-identity.md" },
  { route: "/spec/representations", sourcePath: "spec/representations.md" },
  { route: "/spec/representation-negotiation", sourcePath: "spec/representation-negotiation.md" },
  { route: "/spec/region-update-semantics", sourcePath: "spec/region-update-semantics.md" },
  { route: "/spec/versioning-and-conformance", sourcePath: "spec/versioning-and-conformance.md" },
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
