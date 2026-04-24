import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createApp } from "@mdanai/sdk";

const appId = "__APP_ID__";
const projectName = __PROJECT_NAME_JSON__;
const root = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(join(root, "index.md"), "utf8");
const actionJson = JSON.parse(readFileSync(join(root, "index.action.json"), "utf8"));

export function createAppServer(initialMessages = ["Welcome to MDAN"]) {
  const messages = [...initialMessages];
  const app = createApp({
    appId,
    browserShell: {
      title: projectName,
      moduleMode: "local-dist"
    }
  });
  const home = app.page("/", {
    markdown: template,
    actionJson,
    render(currentMessages) {
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
    const message = String(inputs.message ?? "").trim();
    if (message) {
      messages.unshift(message);
    }
    return home.bind(messages).render();
  });

  return app;
}
