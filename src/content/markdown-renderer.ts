import { stripAgentBlocks } from "./agent-blocks.js";

export interface MdanMarkdownRenderer {
  render(markdown: string): string;
}

type RenderNode =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseRenderableMarkdown(markdown: string): RenderNode[] {
  const lines = stripAgentBlocks(markdown).split("\n");
  const visible: string[] = [];
  let inFrontmatter = false;
  let frontmatterHandled = false;
  let inCode = false;

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
    if (trimmed.startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode || trimmed.startsWith("<!-- mdan:block")) {
      continue;
    }
    visible.push(line);
  }

  const nodes: RenderNode[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  function flushParagraph(): void {
    const text = paragraphLines.map((line) => line.trim()).filter(Boolean).join(" ").trim();
    if (text) {
      nodes.push({ type: "p", text });
    }
    paragraphLines = [];
  }

  function flushList(): void {
    const items = listItems.map((item) => item.trim()).filter(Boolean);
    if (items.length > 0) {
      nodes.push({ type: "ul", items });
    }
    listItems = [];
  }

  function flushAll(): void {
    flushParagraph();
    flushList();
  }

  for (const line of visible) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushAll();
      nodes.push({ type: "h1", text: trimmed.slice(2).trim() });
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushAll();
      nodes.push({ type: "h2", text: trimmed.slice(3).trim() });
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      listItems.push(trimmed.slice(2).trim());
      continue;
    }

    flushList();
    paragraphLines.push(trimmed);
  }

  flushAll();
  return nodes;
}

export const basicMarkdownRenderer: MdanMarkdownRenderer = {
  render(markdown: string): string {
    return parseRenderableMarkdown(markdown)
      .map((node) => {
        if (node.type === "h1") {
          return `<h1>${escapeHtml(node.text)}</h1>`;
        }
        if (node.type === "h2") {
          return `<h2>${escapeHtml(node.text)}</h2>`;
        }
        if (node.type === "p") {
          return `<p>${escapeHtml(node.text)}</p>`;
        }
        return `<ul>${node.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
      })
      .join("\n");
  }
};
