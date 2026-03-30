import http from "node:http";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createNodeHost } from "@mdsn/server";

import { createDocsSiteServer } from "./dist/index.js";

const port = Number(process.env.PORT || 4332);
const docsRoot = fileURLToPath(new URL("./", import.meta.url));
const pagesDir = process.env.DOCS_CONTENT_DIR
  ? process.env.DOCS_CONTENT_DIR
  : join(docsRoot, "..", "docs");

function toRoute(fileName) {
  const baseName = fileName.replace(/\.md$/i, "");
  return baseName === "index" ? "/docs" : `/docs/${baseName}`;
}

const fileNames = (await readdir(pagesDir)).filter((name) => name.endsWith(".md")).sort();
const entries = await Promise.all(
  fileNames.map(async (fileName) => [toRoute(fileName), await readFile(join(pagesDir, fileName), "utf8")])
);
const pages = Object.fromEntries(entries);

if (!pages["/docs"]) {
  if (pages["/docs/sdk"]) {
    pages["/docs"] = pages["/docs/sdk"];
  } else {
    throw new Error(`Missing docs home source in ${pagesDir}. Add index.md or sdk.md.`);
  }
}

const mdsn = createDocsSiteServer({
  siteTitle: "MDSNv Docs",
  pages
});

const server = http.createServer(
  createNodeHost(mdsn, {
    rootRedirect: "/docs",
    staticFiles: {
      "/docs-site/site.css": join(docsRoot, "public", "site.css"),
      "/docs-site/docs.js": join(docsRoot, "public", "docs.js")
    }
  })
);

server.listen(port, "127.0.0.1", () => {
  console.log(`MDSNv docs site running at http://127.0.0.1:${port}/docs`);
});
