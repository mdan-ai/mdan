import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

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

export interface CreateBunHostOptions {
  rootRedirect?: string;
  ignoreFavicon?: boolean;
  frontend?: HostFrontendOption;
  frontendEntry?: string;
  staticFiles?: Record<string, string>;
  staticMounts?: BunStaticMount[];
  maxBodyBytes?: number;
  assets?: MdanAssetStoreOptions;
}

export interface BunStaticMount {
  urlPrefix: string;
  directory: string;
}

async function normalizeBody(
  request: Request,
  maxBodyBytes: number,
  assets?: MdanAssetStoreOptions
): Promise<string | undefined> {
  return normalizeDecodedBody(
    await readBody(request, maxBodyBytes),
    request.headers.get("content-type"),
    assets
  );
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

    const body = Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>;
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

function toMdanRequest(
  request: Request,
  body: string | undefined,
  pathnameOverride?: string,
  headerOverrides?: Record<string, string>
): MdanRequest {
  const rawHeaders: Record<string, string | undefined> = {};
  request.headers.forEach((value, key) => {
    rawHeaders[key] = value;
  });
  Object.assign(rawHeaders, headerOverrides ?? {});
  const finalHeaders = finalizeMdanHeaders({
    headers: rawHeaders,
    body
  });
  const url = new URL(request.url);
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

function toResponse(result: MdanResponse): Response {
  const headers = new Headers(result.headers);

  if (typeof result.body === "string") {
    return new Response(result.body, {
      status: result.status,
      headers
    });
  }

  return new Response(toReadableStream(result.body), {
    status: result.status,
    headers
  });
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

async function renderFrontendEntry(
  handler: MdanRequestHandler,
  request: Request,
  options: Pick<CreateBunHostOptions, "frontend">
): Promise<Response> {
  const result = await handler.handle(
    toMdanRequest(request, undefined, undefined, {
      accept: toMarkdownContentType(),
      [MDAN_BROWSER_BOOTSTRAP_INTENT_HEADER]: MDAN_BROWSER_BOOTSTRAP_INTENT_VALUE
    })
  );
  const initialMarkdown = await readResponseBody(result);
  return new Response(renderBuiltinFrontendEntryHtml(options.frontend, { initialMarkdown }), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8"
    }
  });
}

async function runRuntimeRequest(
  handler: MdanRequestHandler,
  request: Request,
  options: Pick<CreateBunHostOptions, "maxBodyBytes" | "assets">,
  pathnameOverride?: string
): Promise<Response> {
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  let normalizedBody: string | undefined;
  try {
    normalizedBody = await normalizeBody(request, maxBodyBytes, options.assets);
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

  const result = await handler.handle(toMdanRequest(request, normalizedBody, pathnameOverride));
  return toResponse(result);
}

export function createHost(handler: MdanRequestHandler, options: CreateBunHostOptions = {}) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const plan = planHostRequest(
      url.pathname,
      request.method,
      request.headers.get("accept"),
      options
    );
    return handlePlannedHostRequest(plan, {
      onRedirect(location) {
        return new Response(null, {
          status: 302,
          headers: {
            location
          }
        });
      },
      onFavicon() {
        return new Response(null, { status: 204 });
      },
      onFrontendEntry() {
        return renderFrontendEntry(handler, request, options);
      },
      async onRuntime() {
        const pathnameOverride = plan.kind === "runtime" ? plan.pathnameOverride : undefined;
        return runRuntimeRequest(handler, request, options, pathnameOverride);
      },
      serveStaticFile(filePath) {
        return tryServeStaticFile(filePath);
      }
    });
  };
}
