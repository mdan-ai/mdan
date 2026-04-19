import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createMdanServer, type BrowserShellOptions } from "@mdanai/sdk/server";

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
const baseActions = JSON.parse(readFileSync(join(root, "app", "actions", "main.json"), "utf8")) as JsonActionSpec;

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

function envelope(messages: string[]) {
  const stateVersion = messages.length + 1;
  const stateId = `starter:home:${stateVersion}`;
  const list = messages.length > 0 ? messages.map((line) => `- ${line}`).join("\n") : "- No messages yet";
  const block = `## Context
This block shows the current starter message feed and accepts a new message submission.

## Result
${list}`;

  const actions = JSON.parse(JSON.stringify(baseActions)) as JsonActionSpec;
  actions.state_id = stateId;
  actions.state_version = stateVersion;

  return {
    content: `---\napp_id: "starter"\nstate_id: "${stateId}"\nstate_version: ${stateVersion}\nactions: "./app/actions/main.json"\nresponse_mode: "page"\n---\n\n${render(template, { main: block })}`,
    actions,
    view: {
      route_path: "/",
      regions: {
        main: block
      }
    }
  };
}

export function createStarterServer(
  initialMessages: string[] = ["Welcome to MDAN"],
  browserShell: BrowserShellOptions = { moduleMode: "local-dist" }
) {
  const messages = [...initialMessages];
  const server = createMdanServer({ browserShell });

  server.page("/", async () => envelope(messages));

  server.post("/post", async ({ inputs }) => {
    const message = (inputs.message ?? "").trim();
    if (message) {
      messages.unshift(message);
    }
    return {
      route: "/",
      ...envelope(messages)
    };
  });

  return server;
}
