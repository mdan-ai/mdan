import {
  parseReadableSurface,
  type ParseMarkdownSurfaceOptions,
  type ReadableSurface
} from "../content/readable-markdown.js";
import { validateAgentBlocks } from "../content/agent-blocks.js";
import { validateContentPair } from "../content/content-actions.js";
import { basicMarkdownRenderer } from "../content/markdown-renderer.js";
import { validateSemanticSlots } from "../content/semantic-slots.js";
import { serializeFragment, serializePage } from "../content/serialize.js";
import type { MdanBlock, MdanFragment, MdanFrontmatter, MdanPage } from "../protocol/types.js";
import { adaptReadableSurfaceToHeadlessSnapshot, adaptReadableSurfaceToMdanPage } from "../surface/adapter.js";
import { resolveUiSnapshotView } from "../ui/model.js";
import {
  renderSurfaceSnapshot as renderWebSurfaceSnapshot,
  type RenderSurfaceSnapshotOptions
} from "../ui/snapshot.js";

export type { ParseMarkdownSurfaceOptions, ReadableSurface, RenderSurfaceSnapshotOptions };

export const markdownResponseRenderer = basicMarkdownRenderer;

export interface CreateMarkdownPageOptions {
  markdown: string;
  frontmatter?: MdanFrontmatter;
  executableContent?: string;
  executableJson?: unknown;
  blockContent?: Record<string, string>;
  blocks?: MdanBlock[];
  visibleBlockNames?: string[];
}

export interface CreateMarkdownFragmentOptions {
  markdown: string;
  executableContent?: string;
  executableJson?: unknown;
  blocks?: MdanBlock[];
}

export function createExecutableContent(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function parseReadableMarkdownResponse(
  content: string,
  options: ParseMarkdownSurfaceOptions = {}
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
  return renderWebSurfaceSnapshot(
    surface ? resolveUiSnapshotView(adaptReadableSurfaceToHeadlessSnapshot(surface)) : undefined,
    options
  );
}

export function renderInitialProjection(
  initialPage: MdanPage | undefined,
  initialReadableSurface: ReadableSurface | undefined,
  options: RenderSurfaceSnapshotOptions = {}
): string {
  if (initialPage) {
    const initialMarkdown = serializeMarkdownPage(initialPage);
    const projectedSurface = parseReadableMarkdownResponse(initialMarkdown, {
      fallbackRoute:
        typeof initialPage.frontmatter.route === "string"
          ? initialPage.frontmatter.route
          : undefined
    });
    if (projectedSurface) {
      return renderSurfaceSnapshot(projectedSurface, options);
    }
    const renderer = options.markdownRenderer ?? markdownResponseRenderer;
    return renderer.render(initialMarkdown, {
      kind: "page",
      route: typeof initialPage.frontmatter.route === "string" ? initialPage.frontmatter.route : undefined
    });
  }
  return renderSurfaceSnapshot(initialReadableSurface, options);
}

export function serializeMarkdownPage(page: MdanPage): string {
  return serializePage(page);
}

export function serializeMarkdownFragment(fragment: MdanFragment): string {
  return serializeFragment(fragment);
}

export function validateMarkdownContentPair(markdown: string, actionIds: string[]) {
  return validateContentPair(markdown, actionIds);
}

export function validateMarkdownAgentBlocks(markdown: string) {
  return validateAgentBlocks(markdown);
}

export function validateMarkdownSemanticSlots(
  markdown: string,
  options?: Parameters<typeof validateSemanticSlots>[1]
) {
  return validateSemanticSlots(markdown, options);
}

export function createMarkdownPage(options: CreateMarkdownPageOptions): MdanPage {
  const blocks = options.blocks ?? [];
  const visibleBlockNames = options.visibleBlockNames ?? resolveVisibleBlockNames(options.blockContent, blocks);
  const executableContent = resolveExecutableContent(options.executableContent, options.executableJson);

  return {
    frontmatter: options.frontmatter ?? {},
    markdown: options.markdown,
    ...(executableContent ? { executableContent } : {}),
    ...(options.blockContent ? { blockContent: options.blockContent } : {}),
    blocks,
    ...(visibleBlockNames ? { visibleBlockNames } : {})
  };
}

export function createMarkdownFragment(options: CreateMarkdownFragmentOptions): MdanFragment {
  const executableContent = resolveExecutableContent(options.executableContent, options.executableJson);
  return {
    markdown: options.markdown,
    ...(executableContent ? { executableContent } : {}),
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
