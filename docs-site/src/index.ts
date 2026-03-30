import { composePage } from "@mdsn/core";
import type { MdsnFrontmatter, MdsnMarkdownRenderer } from "@mdsn/core";
import { createHostedApp } from "@mdsn/server";

import { extractToc, injectHeadingIds, renderDocsMarkdown } from "./markdown.js";
import { docsNav } from "./nav.js";

export interface CreateDocsSiteServerOptions {
  pages: Record<string, string>;
  markdownRenderer?: MdsnMarkdownRenderer;
  siteTitle?: string;
}

interface DocsPageRecord {
  route: string;
  page: ReturnType<typeof composePage>;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toTitle(frontmatter: MdsnFrontmatter, route: string): string {
  const frontmatterTitle = frontmatter.title;
  if (typeof frontmatterTitle === "string" && frontmatterTitle.trim()) {
    return frontmatterTitle.trim();
  }
  const fallback = route.split("/").filter(Boolean).at(-1) ?? "docs";
  return fallback.replaceAll("-", " ");
}

function sortByRoute(records: DocsPageRecord[]): DocsPageRecord[] {
  return [...records].sort((a, b) => {
    if (a.route === "/docs") {
      return -1;
    }
    if (b.route === "/docs") {
      return 1;
    }
    return a.route.localeCompare(b.route);
  });
}

function renderNavigation(availableRoutes: Set<string>, currentRoute: string): string {
  return docsNav
    .map((section) => {
      const links = section.items
        .filter((item) => availableRoutes.has(item.href))
        .map((item) => {
          const active = item.href === currentRoute ? ' aria-current="page"' : "";
          return `<a href="${escapeHtml(item.href)}" data-nav-link${active}>${escapeHtml(item.label)}</a>`;
        })
        .join("");
      if (!links) {
        return "";
      }
      return `<section class="docs-nav-section"><h2>${escapeHtml(section.section)}</h2><nav>${links}</nav></section>`;
    })
    .join("");
}

function renderToc(items: ReturnType<typeof extractToc>): string {
  if (items.length === 0) {
    return `<aside class="docs-toc docs-toc-empty"></aside>`;
  }
  const list = items
    .map(
      (item) =>
        `<li class="depth-${item.depth}"><a href="#${escapeHtml(item.id)}" data-toc-link>${escapeHtml(item.text)}</a></li>`
    )
    .join("");
  return `<aside class="docs-toc"><h2>On this page</h2><ul>${list}</ul></aside>`;
}

export function createDocsSiteServer(options: CreateDocsSiteServerOptions) {
  const markdownRenderer = options.markdownRenderer;
  const siteTitle = options.siteTitle ?? "MDSNv Docs";

  const records = sortByRoute(
    Object.entries(options.pages).map(([route, source]) => ({
      route,
      page: composePage(source)
    }))
  );
  const pageMap = new Map(records.map((record) => [record.route, record.page]));
  const availableRoutes = new Set(records.map((record) => record.route));

  return createHostedApp({
    pages: Object.fromEntries(
      records.map(({ route }) => [
        route,
        () => {
          const page = pageMap.get(route);
          if (!page) {
            throw new Error(`Unknown docs route: ${route}`);
          }
          return page;
        }
      ])
    ),
    renderHtml(fragment, renderOptions) {
      const route = renderOptions?.route ?? "/docs";
      const page = pageMap.get(route);
      const pageTitle = page ? toTitle(page.frontmatter, route) : "Docs";
      const navigation = renderNavigation(availableRoutes, route);
      const tocItems = extractToc(fragment.markdown);
      const rendered = markdownRenderer
        ? {
            html: injectHeadingIds(markdownRenderer.render(fragment.markdown), tocItems)
          }
        : renderDocsMarkdown(fragment.markdown);
      const toc = renderToc(tocItems);

      return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(pageTitle)} · ${escapeHtml(siteTitle)}</title>
    <link rel="stylesheet" href="/docs-site/site.css">
    <script defer src="/docs-site/docs.js"></script>
  </head>
  <body>
    <header class="docs-topbar">
      <a class="docs-brand" href="/docs">${escapeHtml(siteTitle)}</a>
    </header>
    <main class="docs-shell">
      <aside class="docs-nav" aria-label="Sidebar navigation">
        <div class="docs-nav-search">
          <label for="docs-nav-filter">Search</label>
          <input id="docs-nav-filter" type="search" placeholder="Search docs...">
        </div>
        ${navigation}
      </aside>
      <article class="docs-content" data-docs-content>
        ${rendered.html}
      </article>
      ${toc}
    </main>
  </body>
</html>`;
    }
  });
}
