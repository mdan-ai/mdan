import { marked } from "marked";

import type { MdanMarkdownRenderer } from "../../../src/content/markdown-renderer.js";

function stripFrontmatter(markdown: string): string {
  const lines = markdown.split("\n");
  if (lines[0]?.trim() !== "---") {
    return markdown;
  }

  let endIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === "---") {
      endIndex = index;
      break;
    }
  }

  return endIndex >= 0 ? lines.slice(endIndex + 1).join("\n") : markdown;
}

function stripExecutableCodeBlocks(markdown: string): string {
  return markdown.replace(/\n?```mdan[\s\S]*?```/g, "");
}

function unwrapContentBlocks(markdown: string): string {
  return markdown
    .replace(/^:::\s*block\{[^}]*\}\s*$/gm, "")
    .replace(/^:::\s*$/gm, "");
}

export const weatherMarkdownRenderer: MdanMarkdownRenderer = {
  render(markdown: string): string {
    const cleaned = unwrapContentBlocks(stripExecutableCodeBlocks(stripFrontmatter(markdown)));
    const html = marked.parse(cleaned, {
      async: false
    });
    return typeof html === "string" ? html : "";
  }
};
