import { createFormCustomizationServer } from "./app.js";
import frontend from "./frontend.js";

const port = Number(process.env.PORT ?? "4326");
const app = createFormCustomizationServer();
const host = app.host("bun", {
  frontend,
  browser: {
    projection: "html"
  }
});

Bun.serve({
  port,
  fetch(request) {
    return host(request);
  }
});

console.log(`form customization dev server listening on http://127.0.0.1:${port}`);
