import { stripAgentBlocks } from "../content/agent-blocks.js";

export { stripAgentBlocks };
export {
  parseReadableSurface,
  type ParseMarkdownSurfaceOptions,
  type ReadableSurface
} from "../content/readable-markdown.js";
export {
  basicMarkdownRenderer,
  type MdanMarkdownRenderContext,
  type MdanMarkdownRenderer
} from "../content/markdown-renderer.js";

function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

function stripContentBlocks(markdown: string): string {
  return markdown
    .replace(/^\s*<!--\s*mdan:block\b[^>]*-->\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripReadablePageMarkdown(markdown: string): string {
  return stripAgentBlocks(stripContentBlocks(stripFrontmatter(markdown)));
}

export function stripReadableBlockMarkdown(markdown: string): string {
  return stripAgentBlocks(markdown);
}
