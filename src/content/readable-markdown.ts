import { parseFrontmatter } from "./content-actions.js";
import type { MdanActionManifest } from "../protocol/surface.js";

const READABLE_MARKDOWN_FALLBACK_ACTIONS: MdanActionManifest = {
  app_id: "mdan",
  state_id: "mdan:readable-markdown",
  state_version: 1,
  blocks: [],
  actions: [],
  allowed_next_actions: []
};

type MdanFence = {
  start: number;
  end: number;
};

export interface ParseMarkdownSurfaceOptions {
  fallbackRoute?: string;
  allowBareMarkdown?: boolean;
}

export interface ReadableSurface {
  markdown: string;
  actions: MdanActionManifest;
  route?: string;
  regions?: Record<string, string>;
}

function extractMdanFences(source: string): MdanFence[] {
  const lines = source.split("\n");
  const executableIndices: MdanFence[] = [];
  let insideFence = false;
  let currentFenceLang: string | null = null;
  let currentStart = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const match = line.match(/^```([a-zA-Z0-9_-]+)?\s*$/);

    if (!insideFence) {
      if (match) {
        insideFence = true;
        currentFenceLang = match[1] ?? "";
        currentStart = index;
      }
      continue;
    }

    if (line.trim() === "```") {
      if (currentFenceLang === "mdan") {
        executableIndices.push({ start: currentStart, end: index });
      }
      insideFence = false;
      currentFenceLang = null;
      currentStart = -1;
    }
  }

  return executableIndices;
}

function extractExecutableFencePayload(source: string, fence: MdanFence): { markdown: string; payload: string } {
  const lines = source.split("\n");
  const payload = lines
    .slice(fence.start + 1, fence.end)
    .filter((line) => line.trim() !== "")
    .join("\n");
  const markdown = lines.filter((_, index) => index < fence.start || index > fence.end).join("\n").trim();
  return {
    markdown,
    payload
  };
}

export function extractExecutableMdanBlock(source: string): { markdown: string; payload: string } | null {
  const fences = extractMdanFences(source);
  for (let index = fences.length - 1; index >= 0; index -= 1) {
    const executable = extractExecutableFencePayload(source, fences[index]!);
    try {
      const parsed = JSON.parse(executable.payload) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return executable;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function parseMarkdownSurface(
  content: string,
  options: ParseMarkdownSurfaceOptions = {}
): ReadableSurface | null {
  const executable = extractExecutableMdanBlock(content);
  try {
    const frontmatter = parseFrontmatter(content);
    const route = typeof frontmatter.route === "string" && frontmatter.route.length > 0
      ? frontmatter.route
      : options.fallbackRoute;
    if (!executable) {
      if (!options.allowBareMarkdown) {
        return null;
      }
      return {
        markdown: content.trim(),
        actions: READABLE_MARKDOWN_FALLBACK_ACTIONS,
        ...(route ? { route } : {})
      };
    }
    const actions = JSON.parse(executable.payload) as unknown;
    if (!actions || typeof actions !== "object" || Array.isArray(actions)) {
      return null;
    }
    const manifest = actions as MdanActionManifest & { regions?: unknown };
    const manifestRegions =
      manifest.regions && typeof manifest.regions === "object"
        ? Object.fromEntries(
            Object.entries(manifest.regions).filter(
              ([key, value]) => typeof key === "string" && typeof value === "string"
            )
          )
        : {};
    const mergedRegions = manifestRegions;
    return {
      markdown: executable.markdown,
      actions: manifest,
      ...(route ? { route } : {}),
      ...(Object.keys(mergedRegions).length > 0 ? { regions: mergedRegions } : {})
    };
  } catch {
    return null;
  }
}

export function parseReadableSurface(
  content: string,
  options: ParseMarkdownSurfaceOptions = {}
): ReadableSurface | null {
  return parseMarkdownSurface(content, options);
}
