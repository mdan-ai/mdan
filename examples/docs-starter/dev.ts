import { createDocsStarterServer } from "./app.js";

const port = Number(process.env.PORT ?? "4326");
const app = createDocsStarterServer();
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

console.log(`docs-starter dev server listening on http://127.0.0.1:${port}`);
