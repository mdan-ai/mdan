import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createApp, type AppActionJsonManifest } from "@mdanai/sdk";

const root = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(join(root, "app", "index.md"), "utf8");
const actionJson = JSON.parse(readFileSync(join(root, "app", "index.action.json"), "utf8")) as AppActionJsonManifest;
const gettingStarted = readFileSync(join(root, "app", "getting-started.md"), "utf8").trim();

export function createDocsStarterServer() {
  const app = createApp({
    appId: "docs-starter"
  });
  const home = app.page("/", {
    markdown: template,
    actionJson,
    render() {
      return {
        docs: gettingStarted
      };
    }
  });
  app.route(home);

  return app;
}
