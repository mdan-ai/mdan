import http from "node:http";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveDocsSiteRuntimeConfig } from "./config.js";
import { assertDocsPagesExist, docsNav, listDocsRoutes, loadDocsPageSource } from "./content.js";
import {
  extractDescription,
  extractTitle,
  parseMarkdownDocument,
  renderDocsMarkdown,
  renderToc
} from "./markdown.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function toAbsoluteUrl(origin: string, route: string): string {
  return route === "/" ? `${origin}/` : `${origin}${route}`;
}

function normalizeRoute(pathname: string): string {
  if (pathname !== "/" && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname || "/";
}

function contentTypeFor(filePath: string): string {
  switch (extname(filePath)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".txt":
      return "text/plain; charset=utf-8";
    case ".xml":
      return "application/xml; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function renderNavigation(currentRoute: string): string {
  return docsNav
    .map((section) => {
      const links = section.items
        .map((item) => {
          const active = item.route === currentRoute ? ' aria-current="page"' : "";
          return `<a href="${escapeHtml(item.route)}" data-nav-link${active}>${escapeHtml(item.label)}</a>`;
        })
        .join("");
      return `<section class="docs-nav-section"><h2>${escapeHtml(section.title)}</h2><nav>${links}</nav></section>`;
    })
    .join("");
}

function renderLayout(options: {
  assetVersion: string;
  currentRoute: string;
  description: string;
  html: string;
  siteOrigin: string;
  siteTitle: string;
  title: string;
  toc: string;
}): string {
  const canonicalUrl = toAbsoluteUrl(options.siteOrigin, options.currentRoute);
  const fullTitle =
    options.currentRoute === "/" ? `${options.siteTitle} · Developer Documentation` : `${options.title} · ${options.siteTitle}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(fullTitle)}</title>
    <meta name="description" content="${escapeHtml(options.description)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <meta property="og:title" content="${escapeHtml(fullTitle)}">
    <meta property="og:description" content="${escapeHtml(options.description)}">
    <meta property="og:type" content="${options.currentRoute === "/" ? "website" : "article"}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:site_name" content="${escapeHtml(options.siteTitle)}">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${escapeHtml(fullTitle)}">
    <meta name="twitter:description" content="${escapeHtml(options.description)}">
    <link rel="icon" href="/docs-site/logo-mark.svg?v=${options.assetVersion}" type="image/svg+xml">
    <link rel="stylesheet" href="/docs-site/site.css?v=${options.assetVersion}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
    <script defer src="/docs-site/docs.js?v=${options.assetVersion}"></script>
  </head>
  <body>
    <div class="docs-orbit docs-orbit-a"></div>
    <div class="docs-orbit docs-orbit-b"></div>
    <header class="docs-topbar">
      <a class="docs-brand" href="/" aria-label="${escapeHtml(options.siteTitle)}">
        <img src="/docs-site/logo-mark.svg?v=${options.assetVersion}" alt="" width="36" height="36">
        <span class="docs-brand-lockup">
          <span class="docs-brand-mark">MDAN</span>
          <span class="docs-brand-copy">${escapeHtml(options.siteTitle)}</span>
        </span>
      </a>
      <div class="docs-topbar-actions">
        <a class="docs-site-link" href="https://github.com/mdan-ai/mdan" rel="noreferrer" target="_blank">GitHub</a>
      </div>
    </header>
    <main class="docs-shell">
      <aside class="docs-nav" aria-label="Sidebar navigation">
        <div class="docs-nav-search">
          <label for="docs-nav-filter">Search</label>
          <input id="docs-nav-filter" type="search" placeholder="Search docs...">
        </div>
        ${renderNavigation(options.currentRoute)}
      </aside>
      <article class="docs-content" data-docs-content>
        ${options.html}
      </article>
      ${options.toc}
    </main>
    <footer class="docs-footer">
      <div class="docs-footer-inner">
        <p class="docs-footer-copy">${escapeHtml(options.siteTitle)}</p>
        <nav class="docs-footer-links" aria-label="Footer links">
          <a class="docs-footer-link" href="/">Home</a>
          <a class="docs-footer-link" href="/getting-started">Quickstart</a>
          <a class="docs-footer-link" href="/spec">Spec</a>
          <a class="docs-footer-link" href="https://github.com/mdan-ai/mdan" rel="noreferrer" target="_blank">GitHub</a>
        </nav>
      </div>
    </footer>
  </body>
</html>`;
}

function renderNotFound(siteTitle: string, assetVersion: string, siteOrigin: string): string {
  return renderLayout({
    assetVersion,
    currentRoute: "/404",
    description: "Requested MDAN docs page was not found.",
    html: "<h1>Not Found</h1><p>The requested docs page does not exist.</p>",
    siteOrigin,
    siteTitle,
    title: "Not Found",
    toc: '<aside class="docs-toc docs-toc-empty"></aside>'
  });
}

async function renderLlmsTxt(siteOrigin: string): Promise<string> {
  const lines = [
    "# MDAN SDK Docs",
    "",
    "Developer documentation for the current MDAN TypeScript SDK.",
    "",
    "## Key pages"
  ];

  for (const route of listDocsRoutes()) {
    lines.push(`- ${toAbsoluteUrl(siteOrigin, route)}`);
  }

  lines.push("", "## Source", "- https://github.com/mdan-ai/mdan");
  return lines.join("\n");
}

function renderSitemap(siteOrigin: string): string {
  const urls = listDocsRoutes()
    .map(
      (route) =>
        `  <url><loc>${escapeHtml(toAbsoluteUrl(siteOrigin, route))}</loc></url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

const runtimeConfig = resolveDocsSiteRuntimeConfig(process.env);
const docsSiteRoot = fileURLToPath(new URL("../", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const siteOrigin = trimTrailingSlash(runtimeConfig.siteOrigin);
const assetVersion = createHash("sha1").update(String(Date.now())).digest("hex").slice(0, 8);

await assertDocsPagesExist(repoRoot);

const staticFiles = new Map([
  ["/docs-site/site.css", join(docsSiteRoot, "public", "site.css")],
  ["/docs-site/docs.js", join(docsSiteRoot, "public", "docs.js")],
  ["/docs-site/logo-mark.svg", join(docsSiteRoot, "public", "logo-mark.svg")],
  ["/robots.txt", join(docsSiteRoot, "public", "robots.txt")]
]);

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
    response.end("Missing request URL.");
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host ?? "127.0.0.1"}`);
  const route = normalizeRoute(url.pathname);

  const staticFile = staticFiles.get(route);
  if (staticFile) {
    response.writeHead(200, {
      "content-type": contentTypeFor(staticFile),
      "cache-control": route === "/robots.txt" ? "no-cache" : "public, max-age=300"
    });
    createReadStream(staticFile).pipe(response);
    return;
  }

  if (route === "/llms.txt") {
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end(await renderLlmsTxt(siteOrigin));
    return;
  }

  if (route === "/sitemap.xml") {
    response.writeHead(200, { "content-type": "application/xml; charset=utf-8" });
    response.end(renderSitemap(siteOrigin));
    return;
  }

  const source = await loadDocsPageSource(repoRoot, route);
  if (!source) {
    response.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    response.end(renderNotFound(runtimeConfig.siteTitle, assetVersion, siteOrigin));
    return;
  }

  const document = parseMarkdownDocument(source);
  const rendered = renderDocsMarkdown(document.body);
  const title = extractTitle(document, route);
  const description = extractDescription(document);

  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(
    renderLayout({
      assetVersion,
      currentRoute: route,
      description,
      html: rendered.html,
      siteOrigin,
      siteTitle: runtimeConfig.siteTitle,
      title,
      toc: renderToc(rendered.toc)
    })
  );
});

server.listen(runtimeConfig.port, runtimeConfig.host, () => {
  console.log(`MDAN docs site running at http://${runtimeConfig.host}:${runtimeConfig.port}/`);
});
