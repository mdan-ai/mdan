type RequestLikeHeaders = {
  headers: Record<string, string | undefined>;
};

type RequestLikeCookies = RequestLikeHeaders & {
  cookies?: Record<string, string>;
};

type RequestLikeUrl = {
  url: string;
};

function normalizeHeaderName(name: string): string {
  return name.trim().toLowerCase();
}

export function getHeader(request: RequestLikeHeaders, name: string): string | undefined {
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

export function getCookie(request: RequestLikeCookies, name: string): string | undefined {
  const fromMap = request.cookies?.[name];
  if (fromMap) {
    return fromMap;
  }
  return parseCookieHeader(getHeader(request, "cookie"), name);
}

export function getQueryParam(request: RequestLikeUrl, name: string): string | null {
  return new URL(request.url).searchParams.get(name);
}
