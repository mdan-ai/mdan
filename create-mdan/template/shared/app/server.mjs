import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { actions, createApp, fields } from "@mdanai/sdk";

const appId = "__APP_ID__";
const projectName = __PROJECT_NAME_JSON__;
const root = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(join(root, "index.md"), "utf8");

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
    actions: [
      actions.read("refresh_main", {
        label: "Refresh",
        target: "/"
      }),
      actions.write("submit_message", {
        label: "Submit",
        target: "/post",
        input: {
          message: fields.string({ required: true })
        }
      })
    ],
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
