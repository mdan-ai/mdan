import { createHeadlessHost } from "../surface/index.js";
import {
  MDAN_BROWSER_BOOTSTRAP_INTENT_HEADER,
  MDAN_BROWSER_BOOTSTRAP_INTENT_VALUE
} from "../server/types/transport.js";

import { mountMdanUi, type MdanUiRuntime } from "./mount.js";
import type { FrontendHostFactory } from "./contracts.js";
import type { MdanFrontendExtension } from "./extension.js";

declare global {
  interface Window {
    __MDAN_ENTRY_BOOTED__?: boolean;
  }
}

export interface BootEntryOptions {
  root?: ParentNode;
  route?: string;
  initialMarkdown?: string;
  fetchImpl?: typeof fetch;
  createHost?: FrontendHostFactory;
  mountUi?: typeof mountMdanUi;
  frontend?: MdanFrontendExtension;
  window?: Window;
}

export interface BootedEntry {
  route: string;
  runtime: MdanUiRuntime;
}

function normalizeEntryRoute(pathname: string, search = ""): string {
  const normalizedPathname =
    pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return `${normalizedPathname || "/"}${search}`;
}

export function resolveEntryRoute(locationLike: Pick<Location, "pathname" | "search"> | undefined): string {
  if (!locationLike) {
    return "/";
  }
  return normalizeEntryRoute(locationLike.pathname, locationLike.search);
}

export function resolveMarkdownRoute(route: string): string {
  const url = new URL(route, "http://mdan.local");
  const pathname =
    url.pathname !== "/" && url.pathname.endsWith("/") ? url.pathname.slice(0, -1) : url.pathname;
  url.pathname = pathname === "/" ? "/index.md" : pathname.endsWith(".md") ? pathname : `${pathname}.md`;
  return `${url.pathname}${url.search}`;
}

function createEntryFetch(browserWindow: Window, baseFetch: typeof fetch): typeof fetch {
  let bootstrapPending = true;

  return ((input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (method !== "GET") {
      return baseFetch(input, init);
    }

    const rawTarget = typeof input === "string" || input instanceof URL ? String(input) : input.url;
    const targetUrl = new URL(rawTarget, browserWindow.location.origin);
    if (
      targetUrl.origin !== browserWindow.location.origin ||
      targetUrl.pathname.startsWith("/__mdan/") ||
      targetUrl.pathname.endsWith(".md")
    ) {
      return baseFetch(input, init);
    }

    const markdownTarget = resolveMarkdownRoute(`${targetUrl.pathname}${targetUrl.search}`);
    const headers = new Headers(init?.headers);

    if (bootstrapPending) {
      headers.set(MDAN_BROWSER_BOOTSTRAP_INTENT_HEADER, MDAN_BROWSER_BOOTSTRAP_INTENT_VALUE);
      bootstrapPending = false;
    }

    return baseFetch(markdownTarget, {
      ...init,
      headers
    });
  }) as typeof fetch;
}

export function bootEntry(options: BootEntryOptions = {}): BootedEntry {
  const browserWindow = options.window ?? window;
  const route = options.route ?? resolveEntryRoute(browserWindow.location);
  const hostFactory = options.createHost ?? createHeadlessHost;
  const baseFetch = options.fetchImpl ?? browserWindow.fetch.bind(browserWindow);
  const fetchImpl = createEntryFetch(browserWindow, baseFetch);
  const host = hostFactory({
    initialRoute: route,
    initialMarkdown: options.initialMarkdown,
    fetchImpl
  });
  const runtime = (options.mountUi ?? mountMdanUi)({
    root: options.root ?? browserWindow.document,
    host,
    frontend: options.frontend
  });

  runtime.mount();
  if (!options.initialMarkdown) {
    void runtime.sync(route);
  }

  return {
    route,
    runtime
  };
}

export function autoBootEntry(options: BootEntryOptions = {}): BootedEntry | null {
  const browserWindow = options.window ?? (typeof window !== "undefined" ? window : undefined);
  if (!browserWindow || browserWindow.__MDAN_ENTRY_BOOTED__ === true) {
    return null;
  }
  browserWindow.__MDAN_ENTRY_BOOTED__ = true;
  return bootEntry({
    ...options,
    window: browserWindow
  });
}
