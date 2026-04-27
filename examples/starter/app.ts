import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createApp, type AppActionJsonManifest } from "@mdanai/sdk";

const root = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(join(root, "app", "index.md"), "utf8");
const actionJson = JSON.parse(readFileSync(join(root, "app", "index.action.json"), "utf8")) as AppActionJsonManifest;

export function createStarterServer(
  initialMessages: string[] = ["Welcome to MDAN"]
) {
  interface SubmitMessageInputs {
    message?: string;
  }

  const messages = [...initialMessages];
  const app = createApp({
    appId: "starter"
  });
  const home = app.page("/", {
    markdown: template,
    actionJson,
    render(currentMessages: string[]) {
      const list = currentMessages.length > 0
        ? currentMessages.map((line) => `- ${line}`).join("\n")
        : "- No messages yet";
      return {
        main: `## Context
This block shows the current starter message feed and accepts a new message submission.

## Result
${list}`
      };
    }
  });

  app.route(home.bind(messages));

  app.action("/post", async ({ inputs }) => {
    const typed = inputs as SubmitMessageInputs;
    const message = String(typed.message ?? "").trim();
    if (message) {
      messages.unshift(message);
    }
    return home.bind(messages).render();
  });

  return app;
}
