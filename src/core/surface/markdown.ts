import { createHash } from "node:crypto";

import {
  parseReadableSurface,
  validateAgentBlocks,
  validateContentPair,
  validateSemanticSlots,
  serializeFragment,
  serializePage,
  type ParseMarkdownSurfaceOptions,
  type ReadableSurface
} from "../content.js";
import { adaptReadableSurfaceToMdanPage } from "./readable.js";
import type { MdanBlock, MdanFragment, MdanFrontmatter, MdanPage } from "../protocol.js";

export type { ParseMarkdownSurfaceOptions, ReadableSurface };

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

function routeStateSegment(route: string | undefined): string {
  const normalized = (route ?? "/")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "home";
}

function deriveStateVersion(surface: ReadableSurface): number {
  const payload = JSON.stringify({
    markdown: surface.markdown,
    route: surface.route ?? "",
    regions: surface.regions ?? {},
    actions: {
      ...surface.actions,
      state_id: undefined,
      state_version: undefined
    }
  });
  const digest = createHash("sha1").update(payload).digest();
  const version = digest.readUInt32BE(0) % 2147483647;
  return version > 0 ? version : 1;
}

export function normalizeReadableSurface(
  surface: ReadableSurface,
  fallbackAppId?: string
): ReadableSurface {
  const appId =
    typeof surface.actions.app_id === "string" && surface.actions.app_id.trim().length > 0
      ? surface.actions.app_id.trim()
      : typeof fallbackAppId === "string" && fallbackAppId.trim().length > 0
        ? fallbackAppId.trim()
        : "";
  if (!appId) {
    return surface;
  }

  const stateId =
    typeof surface.actions.state_id === "string" && surface.actions.state_id.trim().length > 0
      ? surface.actions.state_id
      : `${appId}:${routeStateSegment(surface.route)}`;
  const stateVersion =
    typeof surface.actions.state_version === "number" && Number.isFinite(surface.actions.state_version)
      ? surface.actions.state_version
      : deriveStateVersion(surface);

  if (
    appId === surface.actions.app_id &&
    stateId === surface.actions.state_id &&
    stateVersion === surface.actions.state_version
  ) {
    return surface;
  }

  return {
    ...surface,
    actions: {
      ...surface.actions,
      app_id: appId,
      state_id: stateId,
      state_version: stateVersion
    }
  };
}
