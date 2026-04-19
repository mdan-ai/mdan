import { createHost } from "@mdanai/sdk/server/bun";

import { createAppServer } from "./app/server.mjs";

const projectName = __PROJECT_NAME_JSON__;
const port = Number(process.env.PORT ?? "4321");
const server = createAppServer();
const host = createHost(server, {
  browserShell: {
    title: projectName,
    moduleMode: "local-dist"
  }
});

Bun.serve({
  port,
  fetch: host
});

console.log(`${projectName} listening on http://127.0.0.1:${port}`);
