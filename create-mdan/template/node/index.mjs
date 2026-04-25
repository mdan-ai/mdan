import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createHost } from "@mdanai/sdk/server/node";

import { createAppServer } from "./app/server.mjs";

const projectName = __PROJECT_NAME_JSON__;
const port = Number(process.env.PORT ?? "4321");
const root = dirname(fileURLToPath(import.meta.url));
const server = createAppServer();
const host = createHost(server, {
  frontendEntry: join(root, "index.html"),
  staticFiles: {
    "/index.html": join(root, "index.html"),
    "/__mdan/entry.js": join(root, "node_modules", "@mdanai", "sdk", "dist-browser", "entry.js")
  }
});

createServer(host).listen(port, () => {
  console.log(`${projectName} listening on http://127.0.0.1:${port}`);
});
