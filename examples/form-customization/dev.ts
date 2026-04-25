import { createHost } from "@mdanai/sdk/server/bun";
import { createFormCustomizationServer } from "./app.js";

const port = Number(process.env.PORT ?? "4326");
const server = createFormCustomizationServer();
const host = createHost(server, {
  browserShell: {
    title: "MDAN Form Customization"
  }
});

Bun.serve({
  port,
  fetch(request) {
    return host(request);
  }
});

console.log(`form customization dev server listening on http://127.0.0.1:${port}`);
