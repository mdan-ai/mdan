import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createApp } from "../../src/app-internal/create-app.js";

const root = dirname(fileURLToPath(import.meta.url));
const template = readFileSync(join(root, "app", "index.md"), "utf8");
const gettingStarted = readFileSync(join(root, "app", "getting-started.md"), "utf8").trim();

export function createDocsStarterServer() {
  const app = createApp({
    id: "docs-starter",
    state: {}
  });

  app.page("/", {
    markdownPath: "./app/index.md",
    markdownSource: template,
    blocks: {
      docs() {
        return gettingStarted;
      }
    },
    actions: {
      refresh_docs: {
        method: "GET",
        path: "/"
      }
    }
  });

  return app.createServer();
}
