import type { IncomingMessage, RequestListener, ServerResponse } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";

import {
  DEFAULT_MAX_BODY_BYTES,
  PayloadTooLargeError
} from "./body-normalization.js";
import { renderBuiltinFrontendEntryHtml, type HostFrontendOption } from "./host/frontend.js";
import { MDAN_BROWSER_BOOTSTRAP_INTENT_HEADER, MDAN_BROWSER_BOOTSTRAP_INTENT_VALUE } from "./types/transport.js";
import { handlePlannedHostRequest } from "./host/flow.js";
import { planHostRequest } from "./host/shared.js";
import { finalizeMdanHeaders, normalizeDecodedBody, toMdanMethod } from "./host/adapter-shared.js";
import { parseCookies } from "./cookies.js";
import {
  getStaticContentType
} from "./host/static-files.js";
import { toMarkdownContentType } from "./content-type.js";
import type { MdanAssetStoreOptions } from "./asset-types.js";
import type { MdanRequest, MdanResponse } from "./types/transport.js";

interface MdanRequestHandler {
  handle(request: MdanRequest): Promise<MdanResponse>;
}

export interface CreateNodeRequestListenerOptions {
  maxBodyBytes?: number;
  assets?: MdanAssetStoreOptions;
}

export interface NodeStaticMount {
  urlPrefix: string;
  directory: string;
}

export interface CreateNodeHostOptions extends CreateNodeRequestListenerOptions {
  rootRedirect?: string;
  ignoreFavicon?: boolean;
  frontend?: HostFrontendOption;
  frontendEntry?: string;
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

async function normalizeBody(
  body: string | undefined,
  contentType: string,
  assets?: MdanAssetStoreOptions
): Promise<string | undefined> {
  return normalizeDecodedBody(body, contentType, assets);
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

function toMdanRequest(
  request: IncomingMessage,
  body: string | undefined,
  pathnameOverride?: string,
  headerOverrides?: Record<string, string>
): MdanRequest {
  const host = request.headers.host ?? "127.0.0.1";
  const rawHeaders = Object.fromEntries(
    Object.entries(request.headers).map(([key, value]) => [key, normalizeHeaderValue(value)])
  ) as Record<string, string | undefined>;
  Object.assign(rawHeaders, headerOverrides ?? {});
  const finalHeaders = finalizeMdanHeaders({
    headers: rawHeaders,
    body
  });
  const url = new URL(request.url ?? "/", `http://${host}`);
  if (pathnameOverride) {
    url.pathname = pathnameOverride;
  }
  const query = Object.fromEntries(url.searchParams.entries());

  return {
    method: toMdanMethod(request.method),
    url: url.toString(),
    headers: finalHeaders,
    ...(Object.keys(query).length > 0 ? { query } : {}),
    ...(body ? { body } : {}),
    cookies: parseCookies(finalHeaders.cookie)
  };
}

async function readResponseBody(result: MdanResponse): Promise<string> {
  if (typeof result.body === "string") {
    return result.body;
  }
  let combined = "";
  for await (const chunk of result.body) {
    combined += chunk;
  }
  return combined;
}

async function writeResponse(response: ServerResponse, result: MdanResponse): Promise<void> {
  response.statusCode = result.status;
  for (const [key, value] of Object.entries(result.headers)) {
    response.setHeader(key, value);
  }
  if (typeof result.body === "string") {
    response.end(result.body);
    return;
  }

  for await (const chunk of result.body) {
    response.write(chunk);
  }
  response.end();
}

async function runRuntimeRequest(
  handler: MdanRequestHandler,
  request: IncomingMessage,
  response: ServerResponse,
  options: CreateNodeRequestListenerOptions,
  pathnameOverride?: string
): Promise<void> {
  const contentType = request.headers["content-type"] ?? "";
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  let normalizedBody: string | undefined;
  try {
    normalizedBody = await normalizeBody(await readBody(request, maxBodyBytes), contentType, options.assets);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      response.statusCode = 413;
      response.setHeader("content-type", toMarkdownContentType());
      response.end("## Payload Too Large\n\nRequest body exceeded maxBodyBytes.");
      return;
    }
    throw error;
  }
  const result = await handler.handle(toMdanRequest(request, normalizedBody, pathnameOverride));
  await writeResponse(response, result);
}

async function renderFrontendEntry(
  handler: MdanRequestHandler,
  request: IncomingMessage,
  response: ServerResponse,
  options: Pick<CreateNodeHostOptions, "frontend">
): Promise<void> {
  const result = await handler.handle(
    toMdanRequest(request, undefined, undefined, {
      accept: toMarkdownContentType(),
      [MDAN_BROWSER_BOOTSTRAP_INTENT_HEADER]: MDAN_BROWSER_BOOTSTRAP_INTENT_VALUE
    })
  );
  response.statusCode = 200;
  response.setHeader("content-type", "text/html; charset=utf-8");
  response.end(renderBuiltinFrontendEntryHtml(options.frontend, { initialMarkdown: await readResponseBody(result) }));
}

export function createNodeRequestListener(
  handler: MdanRequestHandler,
  options: CreateNodeRequestListenerOptions = {}
): RequestListener {
  return async (request, response) => {
    await runRuntimeRequest(handler, request, response, options);
  };
}

export function createNodeHost(handler: MdanRequestHandler, options: CreateNodeHostOptions = {}): RequestListener {
  const requestListener = createNodeRequestListener(handler, options);

  return async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    const plan = planHostRequest(
      url.pathname,
      request.method ?? "GET",
      normalizeHeaderValue(request.headers.accept),
      options
    );
    await handlePlannedHostRequest<boolean>(plan, {
      onRedirect(location) {
        response.statusCode = 302;
        response.setHeader("location", location);
        response.end();
        return true;
      },
      onFavicon() {
        response.statusCode = 204;
        response.end();
        return true;
      },
      async onFrontendEntry() {
        await renderFrontendEntry(handler, request, response, options);
        return true;
      },
      async onRuntime() {
        const pathnameOverride = plan.kind === "runtime" ? plan.pathnameOverride : undefined;
        await runRuntimeRequest(handler, request, response, options, pathnameOverride);
        return true;
      },
      serveStaticFile(filePath) {
        return tryServeStaticFile(request, response, filePath);
      }
    });
  };
}
