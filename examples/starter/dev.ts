import { createHost } from "@mdanai/sdk/server/bun";
import { createStarterServer } from "./app.js";

const port = Number(process.env.PORT ?? "4323");
const server = createStarterServer();
const host = createHost(server, {
  frontend: true
});

Bun.serve({
  port,
  fetch: host
});

console.log(`starter dev server listening on http://127.0.0.1:${port}`);
