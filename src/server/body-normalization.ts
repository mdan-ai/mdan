import { serializeJsonBody } from "./json-body.js";
import { createLocalAssetHandle } from "./assets.js";
import type { MdanAssetStoreOptions } from "./asset-types.js";

export const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
export const MDAN_ASSET_REFERENCE_SCHEME = "mdan-asset://";

export class PayloadTooLargeError extends Error {
  constructor() {
    super("Payload Too Large");
  }
}

export function isFormEncodedContentType(contentType: string | null | undefined): boolean {
  return (
    contentType?.includes("application/x-www-form-urlencoded") === true ||
    contentType?.includes("multipart/form-data") === true
  );
}

export async function normalizeMultipartBody(
  body: string,
  contentType: string,
  options: MdanAssetStoreOptions = {}
): Promise<string> {
  const request = new Request("http://mdan.local/", {
    method: "POST",
    headers: {
      "content-type": contentType
    },
    body
  });
  const formData = await request.formData();
  const values: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    values[key] = typeof value === "string" ? value : await createLocalAssetHandle(value, options);
  }
  return serializeJsonBody(values);
}

export function normalizeUrlEncodedBody(body: string): string {
  const params = new URLSearchParams(body);
  return serializeJsonBody(Object.fromEntries(params.entries()));
}
