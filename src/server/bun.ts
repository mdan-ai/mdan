import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import {
  DEFAULT_MAX_BODY_BYTES,
  PayloadTooLargeError
} from "./body-normalization.js";
import {
  adaptBrowserFormResponse,
  isBrowserFormRequest
} from "./browser-form-bridge.js";
import {
  type BrowserShellOptions
} from "./browser-shell.js";
import { handlePlannedHostRequest } from "./host-flow-shared.js";
import { planHostRequest } from "./host-shared.js";
import { finalizeMdanHeaders, normalizeDecodedBody, toMdanMethod } from "./host-adapter-shared.js";
import { parseCookies } from "./cookies.js";
import {
  getStaticContentType
} from "./static-files.js";
import { toMarkdownContentType } from "./content-type.js";
import type { MdanAssetStoreOptions } from "./asset-types.js";
import type { MdanRequest, MdanResponse } from "./types.js";

interface MdanRequestHandler {
  handle(request: MdanRequest): Promise<MdanResponse>;
}

export interface CreateBunHostOptions {
  rootRedirect?: string;
  ignoreFavicon?: boolean;
  staticFiles?: Record<string, string>;
  staticMounts?: BunStaticMount[];
  browserShell?: BrowserShellOptions;
  transformHtml?: (html: string) => string;
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

function toMdanRequest(request: Request, body: string | undefined, options: { browserForm?: boolean } = {}): MdanRequest {
  const rawHeaders: Record<string, string | undefined> = {};
  request.headers.forEach((value, key) => {
    rawHeaders[key] = value;
  });
  const finalHeaders = finalizeMdanHeaders({
    headers: rawHeaders,
    body,
    browserForm: options.browserForm
  });

  return {
    method: toMdanMethod(request.method),
    url: request.url,
    headers: finalHeaders,
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
      onMissingLocalBrowserModule(filePath) {
        return new Response(
          `<!doctype html><html><body><pre>Missing local browser module: ${filePath}\nRun: bun run build</pre></body></html>`,
          {
            status: 500,
            headers: {
              "content-type": "text/html"
            }
          }
        );
      },
      async onBrowserShell() {
        const htmlRequest = toMdanRequest(request, undefined);
        const htmlResult = await handler.handle(htmlRequest);
        return toResponse(htmlResult, options.transformHtml);
      },
      async onRuntime() {
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

        const browserForm = isBrowserFormRequest(
          request.method,
          request.headers.get("accept"),
          request.headers.get("content-type")
        );
        const result = await handler.handle(toMdanRequest(request, normalizedBody, { browserForm }));
        return toResponse(browserForm ? adaptBrowserFormResponse(result, options.browserShell) : result, options.transformHtml);
      },
      serveStaticFile(filePath) {
        return tryServeStaticFile(filePath);
      }
    });
  };
}
