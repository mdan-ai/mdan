import {
  isProjectableReadableSurface,
  projectReadableSurfaceToPage,
  type ReadableSurface
} from "./artifact.js";
import { normalizeReadableSurface } from "./readable-surface-normalization.js";

import type {
  MdanActionResult,
  MdanHandlerResultLike,
  MdanPageHandlerResult,
  MdanPageResult,
  MdanStreamResult
} from "./types.js";

export interface NormalizedPageResult {
  page: MdanActionResult["page"] | null;
  surface?: ReadableSurface;
  invalid?: true;
  route?: string;
  status?: number;
  headers?: Record<string, string>;
  session?: MdanActionResult["session"];
}

export interface NormalizedActionHandlerResult {
  action?: MdanActionResult;
  stream?: MdanStreamResult;
  surface?: ReadableSurface;
  invalid?: true;
}

interface NormalizedResultMetadata {
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

function normalizeProjectedReadableSurface(
  result: ReadableSurface,
  fallbackAppId?: string
): {
  surface: ReadableSurface;
  page: MdanActionResult["page"];
} {
  const surface = normalizeReadableSurface(result, fallbackAppId);
  return {
    surface,
    page: projectReadableSurfaceToPage(surface)
  };
}

function normalizePageResultMetadata(result: MdanPageResult): NormalizedResultMetadata {
  return {
    ...(result.route ? { route: result.route } : {}),
    ...(result.status !== undefined ? { status: result.status } : {}),
    ...(result.headers ? { headers: result.headers } : {}),
    ...(result.session ? { session: result.session } : {})
  };
}

function normalizeActionSurfaceMetadata(
  extra: Record<string, unknown>,
  readableSurface: ReadableSurface
): Required<Pick<MdanActionResult, "status">> & NormalizedResultMetadata {
  return {
    status: typeof extra.status === "number" ? extra.status : 200,
    ...(typeof extra.route === "string"
      ? { route: extra.route }
      : readableSurface.route
        ? { route: readableSurface.route }
        : {}),
    ...(normalizeHeaders(extra.headers) ? { headers: normalizeHeaders(extra.headers) } : {}),
    ...(normalizeSessionMutation(extra.session) ? { session: normalizeSessionMutation(extra.session) } : {})
  };
}

export function normalizePageHandlerResult(
  result: MdanPageHandlerResult,
  fallbackAppId?: string
): NormalizedPageResult {
  if (!result) {
    return { page: null };
  }
  if (isMdanPageResult(result)) {
    return {
      page: result.page,
      ...normalizePageResultMetadata(result)
    };
  }
  if (isMdanPage(result)) {
    return {
      page: result
    };
  }
  if (!isProjectableReadableSurface(result)) {
    return {
      page: null,
      invalid: true
    };
  }
  const readableSurface = normalizeProjectedReadableSurface(result, fallbackAppId);
  return {
    surface: readableSurface.surface,
    page: readableSurface.page,
    ...(readableSurface.surface.route ? { route: readableSurface.surface.route } : {})
  };
}

export function pageResultToActionResult(
  result: NormalizedPageResult,
  fallbackRoute?: string
): MdanActionResult | null {
  if (!result.page) {
    return null;
  }

  const route = result.route ?? fallbackRoute;
  return {
    status: result.status ?? 200,
    page: result.page,
    ...(route ? { route } : {}),
    ...(result.headers ? { headers: result.headers } : {}),
    ...(result.session ? { session: result.session } : {})
  };
}

export function normalizeActionHandlerResult(
  result: MdanHandlerResultLike,
  fallbackAppId?: string
): MdanActionResult {
  const normalized = normalizeActionHandlerResultLike(result, fallbackAppId);
  if (!normalized.action) {
    if (normalized.stream) {
      throw new TypeError("normalizeActionHandlerResult cannot normalize stream results.");
    }
    throw new TypeError("normalizeActionHandlerResult cannot normalize invalid action handler results.");
  }
  return normalized.action;
}

export function normalizeActionHandlerResultLike(
  result: MdanHandlerResultLike,
  fallbackAppId?: string
): NormalizedActionHandlerResult {
  if ("stream" in result) {
    return {
      stream: result
    };
  }
  if (isMdanActionResult(result)) {
    return {
      action: result
    };
  }
  if (!isProjectableReadableSurface(result)) {
    return {
      invalid: true
    };
  }
  const extra = result as unknown as Record<string, unknown>;
  const readableSurface = normalizeProjectedReadableSurface(result, fallbackAppId);
  const metadata = normalizeActionSurfaceMetadata(extra, readableSurface.surface);
  return {
    surface: readableSurface.surface,
    action: {
      status: metadata.status,
      page: readableSurface.page,
      ...(metadata.route ? { route: metadata.route } : {}),
      ...(metadata.headers ? { headers: metadata.headers } : {}),
      ...(metadata.session ? { session: metadata.session } : {})
    }
  };
}

function isMdanPage(value: unknown): value is MdanPageResult["page"] {
  if (!value || typeof value !== "object") {
    return false;
  }
  const page = value as Record<string, unknown>;
  return typeof page.markdown === "string" && Array.isArray(page.blocks);
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
