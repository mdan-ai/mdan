import { extname, resolve } from "node:path";

import { serializeMarkdownBody } from "../core/markdown-body.js";

export const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
export const MDAN_ASSET_REFERENCE_SCHEME = "mdan-asset://";

export class PayloadTooLargeError extends Error {
  constructor() {
    super("Payload Too Large");
  }
}

export function parseCookies(header: string | null | undefined): Record<string, string> {
  if (!header?.trim()) {
    return {};
  }

  const cookies: Record<string, string> = {};
  for (const pair of header.split(";")) {
    const [rawName, ...rawValue] = pair.split("=");
    const name = rawName?.trim();
    if (!name) {
      continue;
    }
    const serializedValue = rawValue.join("=").trim();
    try {
      cookies[name] = decodeURIComponent(serializedValue);
    } catch {
      cookies[name] = serializedValue;
    }
  }

  return cookies;
}

export function isFormEncodedContentType(contentType: string | null | undefined): boolean {
  return (
    contentType?.includes("application/x-www-form-urlencoded") === true ||
    contentType?.includes("multipart/form-data") === true
  );
}

function toAssetReference(file: File): string {
  const name = encodeURIComponent(file.name ?? "");
  const type = encodeURIComponent(file.type || "application/octet-stream");
  const size = Number.isFinite(file.size) ? String(file.size) : "0";
  return `${MDAN_ASSET_REFERENCE_SCHEME}${name}?type=${type}&size=${size}`;
}

export async function normalizeMultipartBody(
  body: string,
  contentType: string
): Promise<string> {
  const request = new Request("http://mdan.local/", {
    method: "POST",
    headers: {
      "content-type": contentType
    },
    body
  });
  const formData = await request.formData();
  const values: Record<string, string> = {};
  formData.forEach((value, key) => {
    values[key] = typeof value === "string" ? value : toAssetReference(value);
  });
  return serializeMarkdownBody(values);
}

export function normalizeUrlEncodedBody(body: string): string {
  const params = new URLSearchParams(body);
  return serializeMarkdownBody(Object.fromEntries(params.entries()));
}

export function getStaticContentType(filePath: string): string {
  const extension = extname(filePath);
  return extension === ".js" || extension === ".mjs"
    ? "text/javascript"
    : extension === ".css"
      ? "text/css"
      : extension === ".map" || extension === ".json"
        ? "application/json"
        : extension === ".html"
          ? "text/html"
          : extension === ".svg"
            ? "image/svg+xml"
            : extension === ".txt"
              ? "text/plain"
              : "application/octet-stream";
}

export function resolveMountedFile(directory: string, urlPrefix: string, pathname: string): string | null {
  const normalizedPrefix =
    urlPrefix.length > 1 && urlPrefix.endsWith("/") ? urlPrefix.slice(0, -1) : urlPrefix;

  if (normalizedPrefix === "/") {
    const baseDirectory = resolve(directory);
    const target = resolve(baseDirectory, pathname.replace(/^\/+/, ""));
    if (target !== baseDirectory && !target.startsWith(`${baseDirectory}/`)) {
      return null;
    }
    return target;
  }

  if (pathname !== normalizedPrefix && !pathname.startsWith(`${normalizedPrefix}/`)) {
    return null;
  }

  const relativePath = pathname.slice(normalizedPrefix.length).replace(/^\/+/, "");
  const baseDirectory = resolve(directory);
  const target = resolve(baseDirectory, relativePath);
  if (target !== baseDirectory && !target.startsWith(`${baseDirectory}/`)) {
    return null;
  }
  return target;
}
