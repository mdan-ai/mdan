import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createHost } from "@mdanai/sdk/server/bun";
import { createFormCustomizationServer } from "./app.js";

const port = Number(process.env.PORT ?? "4326");
const root = dirname(fileURLToPath(import.meta.url));
const server = createFormCustomizationServer();
const host = createHost(server, {
  frontendEntry: join(root, "..", "shared", "index.html"),
  staticFiles: {
    "/index.html": join(root, "..", "shared", "index.html"),
    "/__mdan/entry.js": join(root, "..", "..", "dist-browser", "entry.js")
  }
});

Bun.serve({
  port,
  fetch(request) {
    return host(request);
  }
});

console.log(`form customization dev server listening on http://127.0.0.1:${port}`);
