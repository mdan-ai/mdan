import {
  parseReadableSurface,
  type ParseMarkdownArtifactSurfaceOptions,
  type ReadableSurface
} from "../content/artifact-surface.js";
import { validateAgentBlocks } from "../content/agent-blocks.js";
import { validateContentPair } from "../content/content-actions.js";
import { basicMarkdownRenderer } from "../content/markdown-renderer.js";
import { validateSemanticSlots } from "../content/semantic-slots.js";
import { serializeFragment, serializePage } from "../content/serialize.js";
import type { MdanBlock, MdanFragment, MdanFrontmatter, MdanPage } from "../protocol/types.js";
import { adaptReadableSurfaceToMdanPage } from "../surface/adapter.js";
import {
  renderSurfaceSnapshot as renderWebSurfaceSnapshot,
  type RenderSurfaceSnapshotOptions
} from "../surface/snapshot.js";

export type { ParseMarkdownArtifactSurfaceOptions, ReadableSurface, RenderSurfaceSnapshotOptions };

export const artifactMarkdownRenderer = basicMarkdownRenderer;

export interface CreateArtifactPageOptions {
  markdown: string;
  frontmatter?: MdanFrontmatter;
  executableContent?: string;
  executableJson?: unknown;
  blockContent?: Record<string, string>;
  blocks?: MdanBlock[];
  visibleBlockNames?: string[];
}

export interface CreateArtifactFragmentOptions {
  markdown: string;
  executableContent?: string;
  executableJson?: unknown;
  blocks?: MdanBlock[];
}

export function createExecutableContent(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function parseReadableArtifactSurface(
  content: string,
  options: ParseMarkdownArtifactSurfaceOptions = {}
): ReadableSurface | null {
  return parseReadableSurface(content, options);
}

export function isProjectableReadableSurface(value: unknown): value is ReadableSurface {
  if (!value || typeof value !== "object") {
    return false;
  }
  return typeof (value as ReadableSurface).markdown === "string" && typeof (value as ReadableSurface).actions === "object";
}

export function projectReadableSurfaceToPage(surface: ReadableSurface): MdanPage {
  return adaptReadableSurfaceToMdanPage(surface);
}

export function renderSurfaceSnapshot(
  surface: ReadableSurface | undefined,
  options?: RenderSurfaceSnapshotOptions
): string {
  return renderWebSurfaceSnapshot(surface, options);
}

export function renderInitialProjection(
  initialPage: MdanPage | undefined,
  initialReadableSurface: ReadableSurface | undefined,
  options: RenderSurfaceSnapshotOptions = {}
): string {
  if (initialPage) {
    const initialArtifact = serializeArtifactPage(initialPage);
    const projectedSurface = parseReadableArtifactSurface(initialArtifact, {
      fallbackRoute:
        typeof initialPage.frontmatter.route === "string"
          ? initialPage.frontmatter.route
          : undefined
    });
    if (projectedSurface) {
      return renderSurfaceSnapshot(projectedSurface, options);
    }
    const renderer = options.markdownRenderer ?? artifactMarkdownRenderer;
    return renderer.render(initialArtifact, {
      kind: "page",
      route: typeof initialPage.frontmatter.route === "string" ? initialPage.frontmatter.route : undefined
    });
  }
  return renderSurfaceSnapshot(initialReadableSurface, options);
}

export function serializeArtifactPage(page: MdanPage): string {
  return serializePage(page);
}

export function serializeArtifactFragment(fragment: MdanFragment): string {
  return serializeFragment(fragment);
}

export function validateArtifactContentPair(markdown: string, actionIds: string[]) {
  return validateContentPair(markdown, actionIds);
}

export function validateArtifactAgentBlocks(markdown: string) {
  return validateAgentBlocks(markdown);
}

export function validateArtifactSemanticSlots(
  markdown: string,
  options?: Parameters<typeof validateSemanticSlots>[1]
) {
  return validateSemanticSlots(markdown, options);
}

export function createArtifactPage(options: CreateArtifactPageOptions): MdanPage {
  const blocks = options.blocks ?? [];
  const visibleBlockNames = options.visibleBlockNames ?? resolveVisibleBlockNames(options.blockContent, blocks);

  return {
    frontmatter: options.frontmatter ?? {},
    markdown: options.markdown,
    ...(resolveExecutableContent(options.executableContent, options.executableJson)
      ? { executableContent: resolveExecutableContent(options.executableContent, options.executableJson) }
      : {}),
    ...(options.blockContent ? { blockContent: options.blockContent } : {}),
    blocks,
    ...(visibleBlockNames ? { visibleBlockNames } : {})
  };
}

export function createArtifactFragment(options: CreateArtifactFragmentOptions): MdanFragment {
  return {
    markdown: options.markdown,
    ...(resolveExecutableContent(options.executableContent, options.executableJson)
      ? { executableContent: resolveExecutableContent(options.executableContent, options.executableJson) }
      : {}),
    blocks: options.blocks ?? []
  };
}

function resolveExecutableContent(
  executableContent: string | undefined,
  executableJson: unknown
): string | undefined {
  if (typeof executableContent === "string" && executableContent.trim().length > 0) {
    return executableContent;
  }
  if (executableJson !== undefined) {
    return createExecutableContent(executableJson);
  }
  return undefined;
}

function resolveVisibleBlockNames(
  blockContent: Record<string, string> | undefined,
  blocks: MdanBlock[]
): string[] | undefined {
  const names = new Set<string>();
  for (const block of blocks) {
    names.add(block.name);
  }
  for (const name of Object.keys(blockContent ?? {})) {
    names.add(name);
  }
  return names.size > 0 ? [...names] : undefined;
}
