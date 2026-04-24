import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHost } from "@mdanai/sdk/server/bun";
import { createFormCustomizationServer } from "./app.js";

const port = Number(process.env.PORT ?? "4326");
const exampleRoot = import.meta.dir;
const server = createFormCustomizationServer();
const host = createHost(server, {
  browserShell: {
    title: "MDAN Form Customization",
    surfaceModuleSrc: "/__mdan/surface.js",
    uiModuleSrc: "/browser-ui.js"
  }
});

Bun.serve({
  port,
  fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/browser-ui.js") {
      return new Response(readFileSync(join(exampleRoot, "browser-ui.js"), "utf8"), {
        headers: { "content-type": "text/javascript" }
      });
    }

    if (url.pathname === "/form-renderer.js") {
      return new Response(readFileSync(join(exampleRoot, "form-renderer.js"), "utf8"), {
        headers: { "content-type": "text/javascript" }
      });
    }

    return host(request);
  }
});

console.log(`form customization dev server listening on http://127.0.0.1:${port}`);
