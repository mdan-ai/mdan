import { createStarterServer } from "./app.js";

const port = Number(process.env.PORT ?? "4323");
const app = createStarterServer();
const host = app.host("bun", {
  frontend: true,
  browser: {
    projection: "html"
  }
});

Bun.serve({
  port,
  fetch: host
});

console.log(`starter dev server listening on http://127.0.0.1:${port}`);
