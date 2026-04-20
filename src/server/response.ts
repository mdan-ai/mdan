import type { MdanFragment, MdanPage } from "../protocol/types.js";
import { serializeArtifactFragment, serializeArtifactPage } from "./artifact.js";
import { serializeSseMessage } from "./sse.js";
import { renderBrowserShell, type BrowserShellOptions } from "./browser-shell.js";
import type { ProjectableReadableSurface } from "./surface-projection.js";
import { toMarkdownContentType } from "./content-type.js";
import type {
  MdanActionResult,
  MdanHandlerResult,
  MdanResponse,
  MdanStreamChunk,
  MdanStreamResult
} from "./types.js";

function resolveResponseBody(result: MdanActionResult): string {
  if (result.page) {
    return serializeMarkdownPage(result.page);
  }

  if (!result.fragment) {
    throw new Error("Action results must include either a fragment or a page.");
  }

  return serializeMarkdownFragment(result.fragment);
}

function isStreamResult(result: MdanHandlerResult): result is MdanStreamResult {
  return "stream" in result;
}

function toAsyncIterable(stream: AsyncIterable<MdanStreamChunk> | Iterable<MdanStreamChunk>): AsyncIterable<MdanStreamChunk> {
  if (Symbol.asyncIterator in stream) {
    return stream as AsyncIterable<MdanStreamChunk>;
  }

  return (async function* () {
    yield* stream as Iterable<MdanStreamChunk>;
  })();
}

function serializeMarkdownPage(page: MdanPage): string {
  return serializeArtifactPage(page);
}

function serializeMarkdownFragment(fragment: MdanFragment): string {
  return serializeArtifactFragment(fragment);
}

function createStreamBody(result: MdanHandlerResult): string | AsyncIterable<string> {
  if (!isStreamResult(result)) {
    if (!result.fragment) {
      throw new Error("Non-stream event-stream responses must include a fragment.");
    }
    return serializeSseMessage(serializeMarkdownFragment(result.fragment));
  }

  return (async function* () {
    for await (const chunk of toAsyncIterable(result.stream)) {
      const markdown = typeof chunk === "string" ? chunk : serializeMarkdownFragment(chunk);
      yield serializeSseMessage(markdown);
    }
  })();
}

export function createHtmlSurfaceResponse(
  surface: ProjectableReadableSurface,
  options: BrowserShellOptions = {},
  status = 200,
  headers?: Record<string, string>
): MdanResponse {
  return {
    status,
    headers: {
      "content-type": "text/html",
      ...(headers ?? {})
    },
    body: renderBrowserShell({
      ...options,
      initialReadableSurface: surface,
      hydrate: false
    })
  };
}

export function createResponse(
  result: MdanHandlerResult,
  representation: "markdown" | "event-stream"
): MdanResponse {
  const headers = {
    "content-type":
      representation === "markdown"
        ? toMarkdownContentType()
        : "text/event-stream",
    ...(result.headers ?? {})
  };

  const body =
    representation === "markdown"
      ? resolveResponseBody(result as MdanActionResult)
      : createStreamBody(result);

  return {
    status: result.status ?? 200,
    headers,
    body
  };
}

export function createPageResponse(
  page: MdanPage,
  status = 200,
  headers?: Record<string, string>
): MdanResponse {
  return {
    status,
    headers: {
      "content-type": toMarkdownContentType(),
      ...(headers ?? {})
    },
    body: serializeMarkdownPage(page)
  };
}

export function createHtmlPageResponse(
  page: MdanPage,
  options: BrowserShellOptions = {},
  status = 200,
  headers?: Record<string, string>
): MdanResponse {
  return {
    status,
    headers: {
      "content-type": "text/html",
      ...(headers ?? {})
    },
    body: renderBrowserShell({
      ...options,
      initialPage: page
    })
  };
}
