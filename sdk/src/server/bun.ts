import { readFile, stat } from "node:fs/promises";

import {
  DEFAULT_MAX_BODY_BYTES,
  PayloadTooLargeError,
  getStaticContentType,
  isFormEncodedContentType,
  normalizeMultipartBody,
  normalizeUrlEncodedBody,
  parseCookies,
  resolveMountedFile
} from "./adapter-shared.js";
import { toMarkdownContentType } from "./content-type.js";
import type { MdanRequest, MdanResponse } from "./types.js";

interface MdanRequestHandler {
  handle(request: MdanRequest): Promise<MdanResponse>;
}

export interface CreateBunHostOptions {
  rootRedirect?: string;
  ignoreFavicon?: boolean;
  staticFiles?: Record<string, string>;
  staticMounts?: BunStaticMount[];
  transformHtml?: (html: string) => string;
  maxBodyBytes?: number;
}

export interface BunStaticMount {
  urlPrefix: string;
  directory: string;
}

async function normalizeBody(request: Request, maxBodyBytes: number): Promise<string | undefined> {
  const contentType = request.headers.get("content-type");
  if (contentType?.includes("application/x-www-form-urlencoded")) {
    const body = await readBody(request, maxBodyBytes);
    if (!body) {
      return undefined;
    }
    return normalizeUrlEncodedBody(body);
  }
  if (contentType?.includes("multipart/form-data")) {
    const body = await readBody(request, maxBodyBytes);
    if (!body) {
      return undefined;
    }
    return normalizeMultipartBody(body, contentType);
  }
  return readBody(request, maxBodyBytes);
}

async function readBody(request: Request, maxBodyBytes: number): Promise<string | undefined> {
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : Number.NaN;
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
    throw new PayloadTooLargeError();
  }

  const text = await request.text();
  if (!text) {
    return undefined;
  }

  if (Buffer.byteLength(text) > maxBodyBytes) {
    throw new PayloadTooLargeError();
  }

  return text;
}

async function tryServeStaticFile(filePath: string): Promise<Response | null> {
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return null;
    }

    const body = await readFile(filePath);
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": getStaticContentType(filePath),
        "cache-control": "public, max-age=0, must-revalidate"
      }
    });
  } catch {
    return null;
  }
}

function toMdanRequest(request: Request, body: string | undefined): MdanRequest {
  const headers: Record<string, string | undefined> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  headers.accept ??= "text/html";
  if (body && isFormEncodedContentType(headers["content-type"] ?? null)) {
    headers["content-type"] = "text/markdown";
  }

  return {
    method: request.method === "POST" ? "POST" : "GET",
    url: request.url,
    headers,
    ...(body ? { body } : {}),
    cookies: parseCookies(request.headers.get("cookie"))
  };
}

function toReadableStream(body: AsyncIterable<string>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const iterator = body[Symbol.asyncIterator]();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const chunk = await iterator.next();
      if (chunk.done) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunk.value));
    },
    async cancel() {
      if (typeof iterator.return === "function") {
        await iterator.return();
      }
    }
  });
}

function toResponse(result: MdanResponse, transformHtml?: (html: string) => string): Response {
  const headers = new Headers(result.headers);
  const contentType = headers.get("content-type") ?? "";

  if (typeof result.body === "string") {
    return new Response(contentType.includes("text/html") && transformHtml ? transformHtml(result.body) : result.body, {
      status: result.status,
      headers
    });
  }

  return new Response(toReadableStream(result.body), {
    status: result.status,
    headers
  });
}

export function createHost(handler: MdanRequestHandler, options: CreateBunHostOptions = {}) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);

    if (options.rootRedirect && url.pathname === "/") {
      return new Response(null, {
        status: 302,
        headers: {
          location: options.rootRedirect
        }
      });
    }

    if (options.ignoreFavicon !== false && url.pathname === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }

    const staticFile = options.staticFiles?.[url.pathname];
    if (staticFile) {
      const response = await tryServeStaticFile(staticFile);
      if (response) {
        return response;
      }
    }

    for (const mount of options.staticMounts ?? []) {
      const target = resolveMountedFile(mount.directory, mount.urlPrefix, url.pathname);
      if (!target) {
        continue;
      }
      const response = await tryServeStaticFile(target);
      if (response) {
        return response;
      }
    }

    const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
    let normalizedBody: string | undefined;
    try {
      normalizedBody = await normalizeBody(request, maxBodyBytes);
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        return new Response("## Payload Too Large\n\nRequest body exceeded maxBodyBytes.", {
          status: 413,
          headers: {
            "content-type": toMarkdownContentType()
          }
        });
      }
      throw error;
    }

    const result = await handler.handle(toMdanRequest(request, normalizedBody));
    return toResponse(result, options.transformHtml);
  };
}
