import type { NormalizedAction, NormalizedActionInputShape, NormalizedResult } from "./models.js";

export interface RawActionDefinition {
  method: "GET" | "POST";
  path?: string;
  label?: string;
  input?: NormalizedActionInputShape;
  run?: (context: {
    input: Record<string, unknown>;
    state: unknown;
    request: {
      method: "GET" | "POST";
      path: string;
      headers: Record<string, string | undefined>;
    };
  }) => Promise<NormalizedResult> | NormalizedResult;
}

export interface NormalizeActionDefinitionOptions {
  pageId: string;
  pagePath: string;
  actionId: string;
  definition: RawActionDefinition;
}

export function normalizeActionDefinition(options: NormalizeActionDefinitionOptions): NormalizedAction {
  const path = options.definition.path ?? defaultActionPath(options.pagePath, options.actionId);

  return {
    id: options.actionId,
    pageId: options.pageId,
    pagePath: options.pagePath,
    method: options.definition.method,
    path,
    label: options.definition.label ?? labelFromActionId(options.actionId),
    verb: options.definition.method === "GET" ? "read" : "write",
    input: options.definition.input ?? {},
    run: options.definition.run ?? (() => ({ pagePath: options.pagePath }))
  };
}

function defaultActionPath(pagePath: string, actionId: string): string {
  if (pagePath === "/") {
    return `/__actions/${actionId}`;
  }

  return `${pagePath.replace(/\/+$/, "")}/__actions/${actionId}`;
}

function labelFromActionId(actionId: string): string {
  return actionId
    .split(/[_-]+/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

