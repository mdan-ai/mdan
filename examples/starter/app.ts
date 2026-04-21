import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createApp } from "../../src/app-internal/create-app.js";
import type { BrowserShellOptions } from "../../src/server/index.js";

const root = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(join(root, "app", "index.md"), "utf8");

export function createStarterServer(
  initialMessages: string[] = ["Welcome to MDAN"],
  _browserShell: BrowserShellOptions = { moduleMode: "local-dist" }
) {
  const app = createApp({
    id: "starter",
    state: {
      messages: [...initialMessages]
    }
  });

  app.page("/", {
    markdownPath: "./app/index.md",
    markdownSource: template,
    blocks: {
      main({ state }) {
        const list = state.messages.length > 0 ? state.messages.map((line) => `- ${line}`).join("\n") : "- No messages yet";
        return `## Context
This block shows the current starter message feed and accepts a new message submission.

## Result
${list}`;
      }
    },
    actions: {
      refresh_main: {
        method: "GET",
        path: "/"
      },
      submit_message: {
        method: "POST",
        path: "/post",
        label: "Submit",
        input: {
          message: {
            kind: "text",
            required: true
          }
        },
        run({ input, state }) {
          const message = String(input.message ?? "").trim();
          if (message) {
            state.messages.unshift(message);
          }
          return { pagePath: "/" };
        }
      }
    }
  });

  return app.createServer();
}
