import type { JsonSurfaceEnvelope } from "../protocol/surface.js";

import { renderBrowserShell, type BrowserShellOptions } from "./browser-shell.js";
import type { MdanResponse } from "./types.js";

function isJsonSurfaceEnvelope(value: unknown): value is JsonSurfaceEnvelope {
  return value !== null && typeof value === "object" && typeof (value as JsonSurfaceEnvelope).content === "string";
}

function parseJsonSurface(body: string): JsonSurfaceEnvelope | null {
  try {
    const parsed = JSON.parse(body) as unknown;
    return isJsonSurfaceEnvelope(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function isBrowserFormRequest(
  method: string,
  acceptHeader: string | null | undefined,
  contentType: string | null | undefined
): boolean {
  if (method !== "POST") {
    return false;
  }
  if (!acceptHeader?.includes("text/html")) {
    return false;
  }
  return (
    contentType?.includes("application/x-www-form-urlencoded") === true ||
    contentType?.includes("multipart/form-data") === true
  );
}

export function adaptBrowserFormRequestHeaders(headers: Record<string, string | undefined>): Record<string, string | undefined> {
  return {
    ...headers,
    accept: "application/json",
    "x-mdan-browser-form": "true"
  };
}

export function adaptBrowserFormResponse(
  response: MdanResponse,
  options: BrowserShellOptions | undefined
): MdanResponse {
  if (typeof response.body !== "string") {
    return response;
  }
  if ((response.headers["content-type"] ?? "") !== "application/json") {
    return response;
  }

  const surface = parseJsonSurface(response.body);
  if (!surface) {
    return response;
  }

  if (response.status >= 200 && response.status < 300) {
    const route = surface.view?.route_path;
    if (!route) {
      return response;
    }
    return {
      status: 303,
      headers: {
        location: route
      },
      body: ""
    };
  }

  return {
    status: response.status,
    headers: {
      "content-type": "text/html",
      ...(response.headers["set-cookie"] ? { "set-cookie": response.headers["set-cookie"] } : {})
    },
    body: renderBrowserShell({
      ...(options ?? {}),
      initialSurface: surface
    })
  };
}
