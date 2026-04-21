import { normalizeActionDefinition, type RawActionDefinition } from "./normalize-action.js";
import type { NormalizedBlock, NormalizedPage } from "./models.js";

export interface RawPageDefinition {
  markdownPath: string;
  markdownSource: string;
  blocks?: Record<string, NormalizedBlock["render"]>;
  actions?: Record<string, RawActionDefinition>;
}

export interface NormalizePageDefinitionOptions {
  path: string;
  definition: RawPageDefinition;
}

export function normalizePageDefinition(options: NormalizePageDefinitionOptions): NormalizedPage {
  const pageId = pageIdFromPath(options.path);
  const blocks = Object.entries(options.definition.blocks ?? {}).map(([name, render]) => ({
    name,
    render
  }));
  const actions = Object.entries(options.definition.actions ?? {}).map(([actionId, definition]) =>
    normalizeActionDefinition({
      pageId,
      pagePath: options.path,
      actionId,
      definition
    })
  );

  return {
    id: pageId,
    path: options.path,
    markdownPath: options.definition.markdownPath,
    markdownSource: options.definition.markdownSource,
    blocks,
    actions
  };
}

function pageIdFromPath(path: string): string {
  if (path === "/") {
    return "root";
  }

  return path
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean)
    .join("_");
}

