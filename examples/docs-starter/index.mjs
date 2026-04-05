import http from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createHost } from "@mdanai/sdk/server/node";

import { createDocsSiteServer } from "./dist/server.js";

const port = Number(process.env.PORT || 4332);
const exampleRoot = fileURLToPath(new URL("./", import.meta.url));
const pagesDir = join(exampleRoot, "app");

const docsSource = await readFile(join(pagesDir, "docs.md"), "utf8");
const gettingStartedSource = await readFile(join(pagesDir, "getting-started.md"), "utf8");

const mdan = createDocsSiteServer({
  pages: {
    "/docs": docsSource,
    "/docs/getting-started": gettingStartedSource
  }
});

const server = http.createServer(
  createHost(mdan, {
    rootRedirect: "/docs",
    staticFiles: {
      "/docs-site/site.css": join(exampleRoot, "public", "site.css")
    }
  })
);

server.listen(port, "127.0.0.1", () => {
  console.log(`Docs site demo running at http://127.0.0.1:${port}/docs`);
});
