import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createMdanServer } from "@mdanai/sdk/server";

type JsonActionSpec = {
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
const baseActions = JSON.parse(readFileSync(join(root, "app", "actions", "docs.json"), "utf8")) as JsonActionSpec;

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

function envelope() {
  const stateId = "docs-starter:home:1";
  const stateVersion = 1;

  const actions = JSON.parse(JSON.stringify(baseActions)) as JsonActionSpec;
  actions.state_id = stateId;
  actions.state_version = stateVersion;

  return {
    content: `---\napp_id: "docs-starter"\nstate_id: "${stateId}"\nstate_version: ${stateVersion}\nactions: "./app/actions/docs.json"\nresponse_mode: "page"\n---\n\n${render(template, { docs: gettingStarted })}`,
    actions,
    view: {
      route_path: "/",
      regions: {
        docs: gettingStarted
      }
    }
  };
}

export function createDocsStarterServer() {
  const server = createMdanServer();
  server.page("/", async () => envelope());
  return server;
}
