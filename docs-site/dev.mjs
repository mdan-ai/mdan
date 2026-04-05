import http from "node:http";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

import { createNodeHost } from "@mdanai/sdk/server/node";

import { resolveDocsSiteRuntimeConfig } from "./dist/config.js";
import { createDocsSiteServer } from "./dist/index.js";

const runtimeConfig = resolveDocsSiteRuntimeConfig(process.env);
const port = runtimeConfig.port;
const host = runtimeConfig.host;
const docsRoot = fileURLToPath(new URL("./", import.meta.url));
const pagesDir = process.env.DOCS_CONTENT_DIR
  ? process.env.DOCS_CONTENT_DIR
  : join(docsRoot, "..", "docs");
const assetVersion =
  runtimeConfig.assetVersion ??
  createHash("sha1").update(String(Date.now())).digest("hex").slice(0, 8);

async function collectMarkdownFiles(rootDir, relativeDir = "") {
  const dirPath = join(rootDir, relativeDir);
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (relativePath === "superpowers") {
        continue;
      }
      if (relativePath === "releases") {
        continue;
      }
      files.push(...(await collectMarkdownFiles(rootDir, relativePath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(relativePath);
    }
  }

  return files;
}

function toRoute(fileName) {
  if (fileName.startsWith("zh/")) {
    const baseName = fileName.slice(3).replace(/\.md$/i, "");
    return baseName === "index" ? "/zh" : `/zh/${baseName}`;
  }
  const baseName = fileName.replace(/\.md$/i, "");
  return baseName === "index" ? "/" : `/${baseName}`;
}

const fileNames = (await collectMarkdownFiles(pagesDir)).sort();
const entries = await Promise.all(
  fileNames.map(async (fileName) => [toRoute(fileName), await readFile(join(pagesDir, fileName), "utf8")])
);
const pages = Object.fromEntries(entries);

if (!pages["/"]) {
  if (pages["/sdk"]) {
    pages["/"] = pages["/sdk"];
  } else {
    throw new Error(`Missing docs home source in ${pagesDir}. Add index.md or sdk.md.`);
  }
}

if (!pages["/zh"]) {
  pages["/zh"] = pages["/"];
}

const mdan = createDocsSiteServer({
  siteTitle: runtimeConfig.siteTitle,
  siteOrigin: runtimeConfig.siteOrigin,
  assetVersion,
  pages
});

const server = http.createServer(
  createNodeHost(mdan, {
    staticFiles: {
      "/docs-site/site.css": join(docsRoot, "public", "site.css"),
      "/docs-site/docs.js": join(docsRoot, "public", "docs.js"),
      "/docs-site/logo-mark.svg": join(docsRoot, "public", "logo-mark.svg"),
      "/robots.txt": join(docsRoot, "public", "robots.txt"),
      "/llms.txt": join(docsRoot, "public", "llms.txt"),
      "/sitemap.xml": join(docsRoot, "public", "sitemap.xml")
    }
  })
);

server.listen(port, host, () => {
  console.log(`MDAN docs site running at http://${host}:${port}/`);
});
