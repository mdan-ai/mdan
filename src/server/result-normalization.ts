import { projectJsonSurfaceToPage } from "./surface-projection.js";

import type { MdanActionResult, MdanHandlerResultLike, MdanPageHandlerResult } from "./types.js";

export interface NormalizedPageResult {
  page: MdanActionResult["page"] | null;
  route?: string;
}

function normalizeHeaders(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const headers: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") {
      headers[key] = entry;
    }
  }
  return Object.keys(headers).length > 0 ? headers : undefined;
}

function normalizeSessionMutation(value: unknown): MdanActionResult["session"] | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  if ("type" in value && (value.type === "sign-out" || value.type === "sign-in" || value.type === "refresh")) {
    return value as MdanActionResult["session"];
  }
  return undefined;
}

export function normalizePageHandlerResult(result: MdanPageHandlerResult): NormalizedPageResult {
  if (!result) {
    return { page: null };
  }
  return {
    page: projectJsonSurfaceToPage(result),
    ...(result.view?.route_path ? { route: result.view.route_path } : {})
  };
}

export function normalizeActionHandlerResult(result: MdanHandlerResultLike): MdanActionResult {
  if ("stream" in result) {
    throw new TypeError("normalizeActionHandlerResult cannot normalize stream results.");
  }
  const extra = result as Record<string, unknown>;
  const status = typeof extra.status === "number" ? extra.status : 200;
  const route =
    typeof extra.route === "string"
      ? extra.route
      : result.view?.route_path
        ? result.view.route_path
        : undefined;
  const headers = normalizeHeaders(extra.headers);
  const session = normalizeSessionMutation(extra.session);
  return {
    status,
    page: projectJsonSurfaceToPage(result),
    ...(route ? { route } : {}),
    ...(headers ? { headers } : {}),
    ...(session ? { session } : {})
  };
}
