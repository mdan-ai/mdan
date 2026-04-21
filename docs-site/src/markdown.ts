import { Marked, Parser } from "marked";

export interface TocItem {
  depth: 2 | 3;
  id: string;
  text: string;
}

export interface MarkdownDocument {
  metadata: Record<string, string>;
  body: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, "");
}

function slugify(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[*_`~]/g, "")
    .replace(/[^\w\u4e00-\u9fa5 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || "section";
}

function uniqueSlug(slug: string, counts: Map<string, number>): string {
  const count = counts.get(slug) ?? 0;
  counts.set(slug, count + 1);
  return count === 0 ? slug : `${slug}-${count + 1}`;
}

function renderInlineText(parser: Marked, markdown: string): string {
  const rendered = parser.parseInline(markdown);
  if (typeof rendered !== "string") {
    throw new TypeError("Expected synchronous inline markdown rendering.");
  }
  return stripHtmlTags(rendered);
}

function collectHeadings(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  const counts = new Map<string, number>();
  const parser = new Marked({
    gfm: true,
    async: false
  });

  for (const token of parser.lexer(markdown)) {
    if (token.type !== "heading") {
      continue;
    }
    const depth = token.depth as 1 | 2 | 3 | 4 | 5 | 6;
    if (depth !== 2 && depth !== 3) {
      continue;
    }
    const text = renderInlineText(parser, token.text).trim();
    const id = uniqueSlug(slugify(text), counts);
    items.push({ depth, id, text });
  }

  return items;
}

export function parseMarkdownDocument(source: string): MarkdownDocument {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return {
      metadata: {},
      body: source
    };
  }

  const metadata: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) {
      continue;
    }
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (!key || !value) {
      continue;
    }
    metadata[key] = value.replace(/^["']|["']$/g, "");
  }

  return {
    metadata,
    body: match[2]
  };
}

export function extractTitle(document: MarkdownDocument, route: string): string {
  const frontmatterTitle = document.metadata.title;
  if (frontmatterTitle) {
    return frontmatterTitle;
  }

  const headingMatch = document.body.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }

  const fallback = route.split("/").filter(Boolean).at(-1) ?? "docs";
  return fallback.replaceAll("-", " ");
}

export function extractDescription(document: MarkdownDocument): string {
  const frontmatterDescription = document.metadata.description;
  if (frontmatterDescription) {
    return frontmatterDescription;
  }

  const lines = document.body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#") && !line.startsWith("```"));
  return lines[0] ?? "MDAN developer documentation.";
}

export function extractToc(markdown: string): TocItem[] {
  return collectHeadings(markdown);
}

export function renderToc(items: TocItem[]): string {
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

export function renderDocsMarkdown(markdown: string): { html: string; toc: TocItem[] } {
  const toc = collectHeadings(markdown);
  const idQueue = toc.map((item) => item.id);
  const parser = new Marked({
    gfm: true,
    async: false
  });

  parser.use({
    renderer: {
      heading: ({ depth, text, tokens }) => {
        if (depth < 1 || depth > 6) {
          return `<p>${escapeHtml(text)}</p>`;
        }
        const id = depth === 2 || depth === 3 ? idQueue.shift() : undefined;
        const attrs = id ? ` id="${escapeHtml(id)}"` : "";
        const inner = tokens ? Parser.parseInline(tokens) : parser.parseInline(text);
        return `<h${depth}${attrs}>${inner}</h${depth}>`;
      }
    }
  });

  return {
    html: parser.parse(markdown) as string,
    toc
  };
}
