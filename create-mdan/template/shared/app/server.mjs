import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createMdanServer } from "@mdanai/sdk/server";

const appId = "__APP_ID__";
const projectName = __PROJECT_NAME_JSON__;
const root = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(join(root, "index.md"), "utf8");
const baseActions = JSON.parse(readFileSync(join(root, "actions", "main.json"), "utf8"));

function render(templateText, values) {
  return templateText.replace(/:::\s*block\{([^}]*)\}\n:::/g, (full, attrs) => {
    const rawId = attrs.match(/\bid="([^"]+)"/)?.[1];
    const id = rawId?.replace(/\\_/g, "_");
    if (!id || !(id in values)) {
      return full;
    }
    return `::: block{${attrs}}\n${values[id] ?? ""}\n:::`;
  });
}

function createEnvelope(messages) {
  const stateVersion = messages.length + 1;
  const stateId = `${appId}:home:${stateVersion}`;
  const list = messages.length > 0 ? messages.map((line) => `- ${line}`).join("\n") : "- No messages yet";
  const block = `## Context
This block shows the current starter message feed and accepts a new message submission.

## Result
${list}`;

  const actions = structuredClone(baseActions);
  actions.state_id = stateId;
  actions.state_version = stateVersion;

  return {
    content: `---\napp_id: "${appId}"\nstate_id: "${stateId}"\nstate_version: ${stateVersion}\nactions: "./app/actions/main.json"\nresponse_mode: "page"\n---\n\n${render(template, { main: block })}`,
    actions,
    view: {
      route_path: "/",
      regions: {
        main: block
      }
    }
  };
}

export function createAppServer(initialMessages = ["Welcome to MDAN"]) {
  const messages = [...initialMessages];
  const server = createMdanServer({
    browserShell: {
      title: projectName,
      moduleMode: "local-dist"
    }
  });

  server.page("/", async () => createEnvelope(messages));

  server.post("/post", async ({ inputs }) => {
    const message = String(inputs.message ?? "").trim();
    if (message) {
      messages.unshift(message);
    }
    return {
      route: "/",
      ...createEnvelope(messages)
    };
  });

  return server;
}
