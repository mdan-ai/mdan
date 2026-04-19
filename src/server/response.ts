import { serializeFragment, serializePage } from "../content/serialize.js";
import type { MdanFragment, MdanPage } from "../protocol/types.js";
import type { JsonSurfaceEnvelope } from "../protocol/surface.js";
import { serializeSseMessage } from "./sse.js";
import { renderBrowserShell, type BrowserShellOptions } from "./browser-shell.js";
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
  return serializePage(page);
}

function serializeMarkdownFragment(fragment: MdanFragment): string {
  return serializeFragment(fragment);
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

function createJsonErrorSurface(result: MdanHandlerResult): JsonSurfaceEnvelope {
  const status = result.status ?? 500;
  const content =
    "page" in result && result.page
      ? serializeMarkdownPage(result.page)
      : "fragment" in result && result.fragment
        ? serializeMarkdownFragment(result.fragment)
        : `## Error\n\nStatus ${status}`;
  return {
    content,
    actions: {
      app_id: "mdan",
      state_id: `mdan:error:${status}`,
      state_version: 1,
      blocks: [],
      actions: [],
      allowed_next_actions: []
    },
    view: {
      route_path: result.route ?? ""
    }
  };
}

export function createJsonSurfaceResponse(
  envelope: JsonSurfaceEnvelope,
  status = 200,
  headers?: Record<string, string>
): MdanResponse {
  return {
    status,
    headers: {
      "content-type": "application/json",
      ...(headers ?? {})
    },
    body: JSON.stringify({
      content: envelope.content,
      actions: envelope.actions,
      ...(envelope.view ? { view: envelope.view } : {})
    })
  };
}

export function createHtmlSurfaceResponse(
  envelope: JsonSurfaceEnvelope,
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
      initialSurface: envelope
    })
  };
}

export function createResponse(
  result: MdanHandlerResult,
  representation: "json" | "markdown" | "event-stream"
): MdanResponse {
  const headers = {
    "content-type":
      representation === "json"
        ? "application/json"
        : representation === "markdown"
          ? toMarkdownContentType()
          : "text/event-stream",
    ...(result.headers ?? {})
  };

  const body =
    representation === "json"
      ? JSON.stringify(createJsonErrorSurface(result))
      : representation === "markdown"
      ? resolveResponseBody(result as MdanActionResult)
        : createStreamBody(result);

  return {
    status: result.status ?? 200,
    headers,
    body
  };
}

export function createPageResponse(
  page: MdanPage
): MdanResponse {
  return {
    status: 200,
    headers: {
      "content-type": toMarkdownContentType()
    },
    body: serializeMarkdownPage(page)
  };
}
