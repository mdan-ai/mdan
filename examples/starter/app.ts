import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { actions, createApp, fields, type AppBrowserShellOptions } from "../../src/index.js";

const root = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(join(root, "app", "index.md"), "utf8");

export function createStarterServer(
  initialMessages: string[] = ["Welcome to MDAN"],
  browserShell: AppBrowserShellOptions = { moduleMode: "local-dist" }
) {
  const messages = [...initialMessages];
  const app = createApp({
    appId: "starter",
    browserShell
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
    const message = String(inputs.message ?? "").trim();
    if (message) {
      messages.unshift(message);
    }
    return home.bind(messages).render();
  });

  return app;
}
