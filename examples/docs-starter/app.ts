import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createArtifactPage, createMdanServer, type MdanPage } from "../../src/server/index.js";

type ActionManifest = {
  app_id: string;
  state_id: string;
  state_version: number;
  response_mode: "page";
  blocks: string[];
  actions: Array<Record<string, unknown>>;
  allowed_next_actions: string[];
};

const root = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(join(root, "app", "index.md"), "utf8");
const gettingStarted = readFileSync(join(root, "app", "getting-started.md"), "utf8").trim();
const baseActions = JSON.parse(readFileSync(join(root, "app", "actions", "docs.json"), "utf8")) as ActionManifest;

function render(templateText: string, values: Record<string, string>): string {
  return templateText.replace(/:::\s*block\{([^}]*)\}\n:::/g, (full, attrs: string) => {
    const rawId = attrs.match(/\bid="([^"]+)"/)?.[1];
    const id = rawId?.replace(/\\_/g, "_");
    if (!id || !(id in values)) {
      return full;
    }
    return `::: block{${attrs}}\n${values[id] ?? ""}\n:::`;
  });
}

function pageArtifact(): MdanPage {
  const stateId = "docs-starter:home:1";
  const stateVersion = 1;

  const actions = JSON.parse(JSON.stringify(baseActions)) as ActionManifest;
  actions.state_id = stateId;
  actions.state_version = stateVersion;

  return createArtifactPage({
    frontmatter: {
      app_id: "docs-starter",
      state_id: stateId,
      state_version: stateVersion,
      actions: "./app/actions/docs.json",
      response_mode: "page"
    },
    markdown: `${render(template, { docs: gettingStarted })}\n\n<!-- mdan:block docs -->`,
    executableJson: actions,
    blockContent: {
      docs: gettingStarted
    },
    blocks: [
      {
        name: "docs",
        inputs: [],
        operations: [
          {
            method: "GET",
            name: "refresh_docs",
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
  });
}

export function createDocsStarterServer() {
  const server = createMdanServer();
  server.page("/", async () => pageArtifact());
  return server;
}
