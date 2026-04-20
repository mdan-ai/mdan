import { stripAgentBlocks } from "../content/agent-blocks.js";

export { stripAgentBlocks };
export {
  parseReadableSurface,
  type ParseMarkdownArtifactSurfaceOptions,
  type ReadableSurface
} from "../content/artifact-surface.js";
export { basicMarkdownRenderer, type MdanMarkdownRenderer } from "../content/markdown-renderer.js";

function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

function stripContentBlocks(markdown: string): string {
  return markdown
    .replace(/:::\s*block\{[^}]*\}[\s\S]*?:::/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripReadablePageMarkdown(markdown: string): string {
  return stripAgentBlocks(stripContentBlocks(stripFrontmatter(markdown)));
}

export function stripReadableBlockMarkdown(markdown: string): string {
  return stripAgentBlocks(markdown);
}
