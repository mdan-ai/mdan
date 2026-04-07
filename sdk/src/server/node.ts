import type { IncomingMessage, RequestListener, ServerResponse } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";

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

export interface CreateNodeRequestListenerOptions {
  transformHtml?: (html: string) => string;
  maxBodyBytes?: number;
}

export interface NodeStaticMount {
  urlPrefix: string;
  directory: string;
}

export interface CreateNodeHostOptions extends CreateNodeRequestListenerOptions {
  rootRedirect?: string;
  ignoreFavicon?: boolean;
  staticFiles?: Record<string, string>;
  staticMounts?: NodeStaticMount[];
}

async function readBody(request: IncomingMessage, maxBodyBytes: number): Promise<string | undefined> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const chunkBytes = typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.byteLength;
    totalBytes += chunkBytes;
    if (totalBytes > maxBodyBytes) {
      throw new PayloadTooLargeError();
    }
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk, "utf8") : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return undefined;
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function normalizeBody(body: string | undefined, contentType: string): Promise<string | undefined> {
  if (!body) {
    return undefined;
  }
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return normalizeUrlEncodedBody(body);
  }
  if (contentType.includes("multipart/form-data")) {
    return normalizeMultipartBody(body, contentType);
  }
  return body;
}

function toEtag(size: number, mtimeMs: number): string {
  return `W/"${size.toString(16)}-${Math.floor(mtimeMs).toString(16)}"`;
}

async function tryServeStaticFile(request: IncomingMessage, response: ServerResponse, filePath: string): Promise<boolean> {
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return false;
    }

    const contentType = getStaticContentType(filePath);
    const etag = toEtag(fileStat.size, fileStat.mtimeMs);
    response.setHeader("content-type", contentType);
    response.setHeader("cache-control", "public, max-age=0, must-revalidate");
    response.setHeader("etag", etag);

    if (request.headers["if-none-match"] === etag) {
      response.statusCode = 304;
      response.end();
      return true;
    }

    response.statusCode = 200;
    await pipeline(createReadStream(filePath), response);
    return true;
  } catch {
    return false;
  }
}

function normalizeHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return value;
}

function toMdanRequest(request: IncomingMessage, body: string | undefined): MdanRequest {
  const method = request.method === "POST" ? "POST" : "GET";
  const host = request.headers.host ?? "127.0.0.1";
  const headers = Object.fromEntries(
    Object.entries(request.headers).map(([key, value]) => [key, normalizeHeaderValue(value)])
  ) as Record<string, string | undefined>;
  headers.accept ??= "text/html";
  if (body && isFormEncodedContentType(headers["content-type"] ?? "")) {
    headers["content-type"] = "text/markdown";
  }

  return {
    method,
    url: new URL(request.url ?? "/", `http://${host}`).toString(),
    headers,
    ...(body ? { body } : {}),
    cookies: parseCookies(headers.cookie)
  };
}

async function writeResponse(response: ServerResponse, result: MdanResponse, transformHtml?: (html: string) => string): Promise<void> {
  response.statusCode = result.status;
  for (const [key, value] of Object.entries(result.headers)) {
    response.setHeader(key, value);
  }
  const contentType = String(result.headers["content-type"] ?? "");
  if (typeof result.body === "string") {
    response.end(contentType.includes("text/html") && transformHtml ? transformHtml(result.body) : result.body);
    return;
  }

  for await (const chunk of result.body) {
    response.write(chunk);
  }
  response.end();
}

export function createNodeRequestListener(
  handler: MdanRequestHandler,
  options: CreateNodeRequestListenerOptions = {}
): RequestListener {
  return async (request, response) => {
    const contentType = request.headers["content-type"] ?? "";
    const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
    let normalizedBody: string | undefined;
    try {
      normalizedBody = await normalizeBody(await readBody(request, maxBodyBytes), contentType);
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        response.statusCode = 413;
        response.setHeader("content-type", toMarkdownContentType());
        response.end("## Payload Too Large\n\nRequest body exceeded maxBodyBytes.");
        return;
      }
      throw error;
    }
    const result = await handler.handle(toMdanRequest(request, normalizedBody));
    await writeResponse(response, result, options.transformHtml);
  };
}

export function createNodeHost(handler: MdanRequestHandler, options: CreateNodeHostOptions = {}): RequestListener {
  const requestListener = createNodeRequestListener(handler, options);

  return async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);

    if (options.rootRedirect && url.pathname === "/") {
      response.statusCode = 302;
      response.setHeader("location", options.rootRedirect);
      response.end();
      return;
    }

    if (options.ignoreFavicon !== false && url.pathname === "/favicon.ico") {
      response.statusCode = 204;
      response.end();
      return;
    }

    const staticFile = options.staticFiles?.[url.pathname];
    if (staticFile && (await tryServeStaticFile(request, response, staticFile))) {
      return;
    }

    for (const mount of options.staticMounts ?? []) {
      const target = resolveMountedFile(mount.directory, mount.urlPrefix, url.pathname);
      if (target && (await tryServeStaticFile(request, response, target))) {
        return;
      }
    }

    await requestListener(request, response);
  };
}
