import { marked } from "marked";

import type { MdanMarkdownRenderer } from "../../../src/content/markdown-renderer.js";

export const weatherMarkdownRenderer: MdanMarkdownRenderer = {
  render(markdown: string): string {
    const html = marked.parse(markdown, {
      async: false
    });
    return typeof html === "string" ? html : "";
  }
};
