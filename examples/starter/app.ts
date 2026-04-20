import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createArtifactPage, createMdanServer, type BrowserShellOptions, type MdanPage } from "../../src/server/index.js";

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
const baseActions = JSON.parse(readFileSync(join(root, "app", "actions", "main.json"), "utf8")) as ActionManifest;

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

function pageArtifact(messages: string[]): MdanPage {
  const stateVersion = messages.length + 1;
  const stateId = `starter:home:${stateVersion}`;
  const list = messages.length > 0 ? messages.map((line) => `- ${line}`).join("\n") : "- No messages yet";
  const block = `## Context
This block shows the current starter message feed and accepts a new message submission.

## Result
${list}`;

  const actions = JSON.parse(JSON.stringify(baseActions)) as ActionManifest;
  actions.state_id = stateId;
  actions.state_version = stateVersion;

  return createArtifactPage({
    frontmatter: {
      app_id: "starter",
      state_id: stateId,
      state_version: stateVersion,
      actions: "./app/actions/main.json",
      response_mode: "page",
      route: "/"
    },
    markdown: `${render(template, { main: block })}\n\n<!-- mdan:block main -->`,
    executableJson: actions,
    blockContent: {
      main: block
    },
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
            stateEffect: {
              responseMode: "page"
            },
            security: {
              confirmationPolicy: "never"
            },
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false
            }
          },
          {
            method: "POST",
            name: "submit_message",
            target: "/post",
            inputs: ["message"],
            label: "Submit",
            verb: "write",
            stateEffect: {
              responseMode: "page"
            },
            security: {
              confirmationPolicy: "never"
            },
            inputSchema: {
              type: "object",
              required: ["message"],
              properties: {
                message: { type: "string" }
              },
              additionalProperties: false
            }
          }
        ]
      }
    ]
  });
}

export function createStarterServer(
  initialMessages: string[] = ["Welcome to MDAN"],
  browserShell: BrowserShellOptions = { moduleMode: "local-dist" }
) {
  const messages = [...initialMessages];
  const server = createMdanServer({ browserShell });

  server.page("/", async () => pageArtifact(messages));

  server.post("/post", async ({ inputs }) => {
    const message = (inputs.message ?? "").trim();
    if (message) {
      messages.unshift(message);
    }
    return {
      route: "/",
      page: pageArtifact(messages)
    };
  });

  return server;
}
