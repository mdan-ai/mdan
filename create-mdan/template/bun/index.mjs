import { createAppServer } from "./app/server.mjs";

const projectName = __PROJECT_NAME_JSON__;
const port = Number(process.env.PORT ?? "4321");
const app = createAppServer();
const host = app.host("bun", {
  frontend: true
});

Bun.serve({
  port,
  fetch: host
});

console.log(`${projectName} listening on http://127.0.0.1:${port}`);
