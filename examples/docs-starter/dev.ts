import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createHost } from "@mdanai/sdk/server/bun";
import { createDocsStarterServer } from "./app.js";

const port = Number(process.env.PORT ?? "4326");
const root = dirname(fileURLToPath(import.meta.url));
const server = createDocsStarterServer();
const host = createHost(server, {
  frontendEntry: join(root, "..", "shared", "index.html"),
  staticFiles: {
    "/index.html": join(root, "..", "shared", "index.html"),
    "/__mdan/entry.js": join(root, "..", "..", "dist-browser", "entry.js")
  }
});

Bun.serve({
  port,
  fetch: host
});

console.log(`docs-starter dev server listening on http://127.0.0.1:${port}`);
