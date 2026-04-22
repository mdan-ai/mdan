import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { actions, createApp } from "../../src/index.js";

const root = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(join(root, "app", "index.md"), "utf8");
const gettingStarted = readFileSync(join(root, "app", "getting-started.md"), "utf8").trim();

export function createDocsStarterServer() {
  const app = createApp({
    appId: "docs-starter"
  });
  const home = app.page("/", {
    markdown: template,
    actions: [
      actions.read("refresh_docs", {
        label: "Refresh",
        target: "/"
      })
    ],
    render() {
      return {
        docs: gettingStarted
      };
    }
  });
  app.route(home);

  return app;
}
