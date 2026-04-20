import {
  projectReadableSurfaceToPage,
  type ProjectableReadableSurface
} from "./surface-projection.js";

import type {
  MdanActionResult,
  MdanHandlerResultLike,
  MdanPageHandlerResult,
  MdanPageResult
} from "./types.js";

export interface NormalizedPageResult {
  page: MdanActionResult["page"] | null;
  route?: string;
  status?: number;
  headers?: Record<string, string>;
  session?: MdanActionResult["session"];
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
  if (isMdanPageResult(result)) {
    return {
      page: result.page,
      ...(result.route ? { route: result.route } : {}),
      ...(result.status ? { status: result.status } : {}),
      ...(result.headers ? { headers: result.headers } : {}),
      ...(result.session ? { session: result.session } : {})
    };
  }
  if (isMdanPage(result)) {
    return {
      page: result
    };
  }
  const readableSurface = result as ProjectableReadableSurface;
  return {
    page: projectReadableSurfaceToPage(readableSurface),
    ...(readableSurface.route ? { route: readableSurface.route } : {})
  };
}

export function normalizeActionHandlerResult(result: MdanHandlerResultLike): MdanActionResult {
  if ("stream" in result) {
    throw new TypeError("normalizeActionHandlerResult cannot normalize stream results.");
  }
  if (isMdanActionResult(result)) {
    return result;
  }
  const extra = result as unknown as Record<string, unknown>;
  const status = typeof extra.status === "number" ? extra.status : 200;
  const readableSurface = result as ProjectableReadableSurface;
  const route =
    typeof extra.route === "string"
      ? extra.route
      : readableSurface.route
        ? readableSurface.route
        : undefined;
  const headers = normalizeHeaders(extra.headers);
  const session = normalizeSessionMutation(extra.session);
  return {
    status,
    page: projectReadableSurfaceToPage(readableSurface),
    ...(route ? { route } : {}),
    ...(headers ? { headers } : {}),
    ...(session ? { session } : {})
  };
}

function isMdanPage(value: unknown): value is MdanPageResult["page"] {
  if (!value || typeof value !== "object") {
    return false;
  }
  const page = value as Record<string, unknown>;
  return typeof page.markdown === "string" && Array.isArray(page.blocks) && Array.isArray(page.blockAnchors);
}

function isMdanPageResult(value: unknown): value is MdanPageResult {
  if (!value || typeof value !== "object" || !("page" in value)) {
    return false;
  }
  return isMdanPage((value as { page?: unknown }).page);
}

function isMdanActionResult(value: unknown): value is MdanActionResult {
  if (!value || typeof value !== "object") {
    return false;
  }
  const result = value as Record<string, unknown>;
  return isMdanPage(result.page) || isMdanFragment(result.fragment);
}

function isMdanFragment(value: unknown): value is NonNullable<MdanActionResult["fragment"]> {
  if (!value || typeof value !== "object") {
    return false;
  }
  const fragment = value as Record<string, unknown>;
  return typeof fragment.markdown === "string" && Array.isArray(fragment.blocks);
}
