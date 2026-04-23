import type { MdanRequest } from "./types.js";

export interface RequestLocaleOptions {
  defaultLocale?: string;
}

function normalizeHeaderName(name: string): string {
  return name.trim().toLowerCase();
}

export function getHeader(request: Pick<MdanRequest, "headers">, name: string): string | undefined {
  const normalized = normalizeHeaderName(name);
  return request.headers[normalized];
}

function parseCookieHeader(header: string | undefined, name: string): string | undefined {
  if (!header) {
    return undefined;
  }
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey || rawKey !== name) {
      continue;
    }
    return rest.join("=");
  }
  return undefined;
}

export function getCookie(
  request: Pick<MdanRequest, "cookies" | "headers">,
  name: string
): string | undefined {
  const fromMap = request.cookies?.[name];
  if (fromMap) {
    return fromMap;
  }
  return parseCookieHeader(getHeader(request, "cookie"), name);
}

export function getQueryParam(request: Pick<MdanRequest, "url">, name: string): string | null {
  return new URL(request.url).searchParams.get(name);
}

export function getLocaleFromRequest(
  request: Pick<MdanRequest, "url" | "headers">,
  options: RequestLocaleOptions = {}
): string {
  const fallback = options.defaultLocale ?? "en";
  const explicit = getQueryParam(request, "locale")?.trim();
  if (explicit) {
    return explicit;
  }
  const acceptLanguage = getHeader(request, "accept-language")?.trim();
  if (!acceptLanguage) {
    return fallback;
  }
  const first = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0]?.trim())
    .find(Boolean);
  return first || fallback;
}

function firstForwardedFor(value: string | undefined): string | null {
  const first = value?.split(",")[0]?.trim();
  return first || null;
}

function isLoopbackIp(value: string): boolean {
  return value === "127.0.0.1" || value === "::1" || value === "::ffff:127.0.0.1";
}

export function getClientIp(request: Pick<MdanRequest, "headers">): string | null {
  const candidates = [
    getHeader(request, "cf-connecting-ip"),
    getHeader(request, "x-real-ip"),
    firstForwardedFor(getHeader(request, "x-forwarded-for"))
  ];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value || isLoopbackIp(value)) {
      continue;
    }
    return value;
  }
  return null;
}
