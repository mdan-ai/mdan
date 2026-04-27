import { parseFrontmatter } from "../content/content-actions.js";
import { basicMarkdownRenderer } from "../content/markdown-renderer.js";
import { parseReadableSurface } from "../content/readable-markdown.js";
import { adaptReadableSurfaceToHeadlessSnapshot } from "../core/surface/readable.js";
import type { MdanActionManifest } from "../core/protocol.js";

export interface HtmlProjectionMetadata {
  title?: string;
  description?: string;
}

export interface HtmlProjectionResult {
  metadata: HtmlProjectionMetadata;
  bodyHtml: string;
  actions: MdanActionManifest;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function metadataString(frontmatter: Record<string, unknown>, key: string): string | undefined {
  const value = frontmatter[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function renderBlockHtml(name: string, markdown: string): string {
  const renderedBlock = markdown ? basicMarkdownRenderer.render(markdown) : "";
  const escapedName = escapeHtml(name);
  return `<section data-mdan-block="${escapedName}">${renderedBlock}<div data-mdan-action-root data-mdan-block="${escapedName}"></div></section>`;
}

function withoutRuntimeRegions(actions: MdanActionManifest): MdanActionManifest {
  const { regions: _regions, ...contract } = actions;
  return contract;
}

export function projectReadableSurfaceToHtml(markdown: string): HtmlProjectionResult {
  const frontmatter = parseFrontmatter(markdown);
  const surface = parseReadableSurface(markdown, { allowBareMarkdown: true });
  if (!surface) {
    return {
      metadata: {
        title: metadataString(frontmatter, "title"),
        description: metadataString(frontmatter, "description")
      },
      bodyHtml: "",
      actions: { blocks: {}, actions: {} }
    };
  }

  const snapshot = adaptReadableSurfaceToHeadlessSnapshot(surface);
  const pageHtml = snapshot.markdown ? basicMarkdownRenderer.render(snapshot.markdown) : "";
  const blockHtml = snapshot.blocks.map((block) => renderBlockHtml(block.name, block.markdown)).join("\n");

  return {
    metadata: {
      title: metadataString(frontmatter, "title"),
      description: metadataString(frontmatter, "description")
    },
    bodyHtml: [pageHtml, blockHtml].filter(Boolean).join("\n"),
    actions: withoutRuntimeRegions(surface.actions)
  };
}
