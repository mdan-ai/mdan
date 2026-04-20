import { parseReadableArtifactSurface, type ReadableSurface } from "./artifact.js";
import { renderBrowserShell, type BrowserShellOptions } from "./browser-shell.js";
import type { MdanResponse } from "./types.js";

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
    accept: "text/markdown",
    "x-mdan-browser-form": "true"
  };
}

function parseBrowserFormSurface(response: MdanResponse): ReadableSurface | null {
  if (typeof response.body !== "string") {
    return null;
  }
  return parseReadableArtifactSurface(response.body, {
    allowBareMarkdown: true
  });
}

export function adaptBrowserFormResponse(
  response: MdanResponse,
  options: BrowserShellOptions | undefined
): MdanResponse {
  const surface = parseBrowserFormSurface(response);
  if (!surface) {
    return response;
  }

  if (response.status >= 200 && response.status < 300) {
    const route = surface.route;
    if (!route) {
      return {
        status: response.status,
        headers: {
          "content-type": "text/html",
          ...(response.headers["set-cookie"] ? { "set-cookie": response.headers["set-cookie"] } : {})
        },
        body: renderBrowserShell({
          ...(options ?? {}),
          initialReadableSurface: surface
        })
      };
    }
    return {
      status: 303,
      headers: {
        location: route,
        ...(response.headers["set-cookie"] ? { "set-cookie": response.headers["set-cookie"] } : {})
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
      initialReadableSurface: surface
    })
  };
}
