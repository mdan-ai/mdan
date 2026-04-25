import { Renderer, marked } from "marked";

import { stripAgentBlocks } from "./agent-blocks.js";

export interface MdanMarkdownRenderContext {
  kind: "page" | "block";
  route?: string;
  blockName?: string;
}

export interface MdanMarkdownRenderer {
  render(markdown: string, context?: MdanMarkdownRenderContext): string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sanitizeHref(href: string | null | undefined): string | null {
  if (typeof href !== "string") {
    return null;
  }
  const trimmed = href.trim();
  if (!trimmed) {
    return null;
  }
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("?")
  ) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed, "http://mdan.local");
    if (parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:") {
      return trimmed;
    }
    return null;
  } catch {
    return null;
  }
}

function stripFrontmatter(markdown: string): string {
  const lines = markdown.split("\n");
  const visible: string[] = [];
  let inFrontmatter = false;
  let frontmatterHandled = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!frontmatterHandled && trimmed === "---") {
      inFrontmatter = !inFrontmatter;
      if (!inFrontmatter) {
        frontmatterHandled = true;
      }
      continue;
    }
    if (inFrontmatter) {
      continue;
    }
    visible.push(line);
  }

  return visible.join("\n").trim();
}

function prepareRenderableMarkdown(markdown: string): string {
  return stripFrontmatter(stripAgentBlocks(markdown));
}

export const basicMarkdownRenderer: MdanMarkdownRenderer = {
  render(markdown: string): string {
    const prepared = prepareRenderableMarkdown(markdown);
    if (!prepared) {
      return "";
    }

    const renderer = new Renderer();
    renderer.html = ({ text }) => escapeHtml(text);
    renderer.link = ({ href, title, tokens }) => {
      const safeHref = sanitizeHref(href);
      const text = renderer.parser.parseInline(tokens);
      if (!safeHref) {
        return text;
      }
      const titleAttribute = title ? ` title="${escapeHtml(title)}"` : "";
      return `<a href="${escapeHtml(safeHref)}"${titleAttribute}>${text}</a>`;
    };

    return marked.parse(prepared, {
      async: false,
      gfm: true,
      renderer
    });
  }
};
