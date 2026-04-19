import {
  isFormEncodedContentType,
  normalizeMultipartBody,
  normalizeUrlEncodedBody
} from "./body-normalization.js";
import {
  adaptBrowserFormRequestHeaders
} from "./browser-form-bridge.js";
import type { MdanAssetStoreOptions } from "./asset-types.js";

export interface FinalizeMdanHeadersOptions {
  headers: Record<string, string | undefined>;
  body?: string;
  browserForm?: boolean;
}

export async function normalizeDecodedBody(
  body: string | undefined,
  contentType: string | null | undefined,
  assets?: MdanAssetStoreOptions
): Promise<string | undefined> {
  if (!body) {
    return undefined;
  }
  if (contentType?.includes("application/x-www-form-urlencoded")) {
    return normalizeUrlEncodedBody(body);
  }
  if (contentType?.includes("multipart/form-data")) {
    return normalizeMultipartBody(body, contentType, assets);
  }
  return body;
}

export function finalizeMdanHeaders(options: FinalizeMdanHeadersOptions): Record<string, string | undefined> {
  const headers = {
    ...options.headers
  };
  headers.accept ??= "application/json";
  if (options.body && isFormEncodedContentType(headers["content-type"] ?? "")) {
    headers["content-type"] = "application/json";
  }
  return options.browserForm ? adaptBrowserFormRequestHeaders(headers) : headers;
}

export function toMdanMethod(method: string | null | undefined): "GET" | "POST" {
  return method === "POST" ? "POST" : "GET";
}
