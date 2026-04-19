import { createHost } from "@mdanai/sdk/server/bun";
import { createDocsStarterServer } from "./app.js";

const port = Number(process.env.PORT ?? "4326");
const server = createDocsStarterServer();
const host = createHost(server, {
  browserShell: {
    title: "MDAN Docs Starter",
    moduleMode: "local-dist"
  }
});

Bun.serve({
  port,
  fetch: host
});

console.log(`docs-starter-json dev server listening on http://127.0.0.1:${port}`);
