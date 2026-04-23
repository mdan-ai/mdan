import { describe, expect, it } from "vitest";

import {
  getClientIp,
  getCookie,
  getHeader,
  getLocaleFromRequest,
  getQueryParam
} from "../../src/server/request-helpers.js";
import type { MdanRequest } from "../../src/server/types.js";

function createRequest(overrides: Partial<MdanRequest> = {}): MdanRequest {
  return {
    method: "GET",
    url: "https://example.test/path?foo=bar&locale=zh-CN",
    headers: {},
    cookies: {},
    ...overrides
  };
}

describe("server request helpers", () => {
  it("reads header and cookie values", () => {
    const request = createRequest({
      headers: {
        "x-test": "ok"
      },
      cookies: {
        session: "abc"
      }
    });

    expect(getHeader(request, "x-test")).toBe("ok");
    expect(getCookie(request, "session")).toBe("abc");
  });

  it("reads query values from request url", () => {
    const request = createRequest();
    expect(getQueryParam(request, "foo")).toBe("bar");
    expect(getQueryParam(request, "missing")).toBeNull();
  });

  it("resolves locale from explicit query, then accept-language, then default", () => {
    const queryRequest = createRequest({
      url: "https://example.test/path?locale=zh-CN",
      headers: {
        "accept-language": "en-US,en;q=0.8"
      }
    });
    expect(getLocaleFromRequest(queryRequest, { defaultLocale: "en" })).toBe("zh-CN");

    const headerRequest = createRequest({
      url: "https://example.test/path",
      headers: {
        "accept-language": "fr-FR,fr;q=0.9,en;q=0.7"
      }
    });
    expect(getLocaleFromRequest(headerRequest, { defaultLocale: "en" })).toBe("fr-FR");

    const fallbackRequest = createRequest({
      url: "https://example.test/path"
    });
    expect(getLocaleFromRequest(fallbackRequest, { defaultLocale: "en" })).toBe("en");
  });

  it("resolves client ip from common proxy headers", () => {
    const request = createRequest({
      headers: {
        "x-forwarded-for": "127.0.0.1, 203.0.113.7",
        "x-real-ip": "198.51.100.4"
      }
    });
    expect(getClientIp(request)).toBe("198.51.100.4");

    const cloudflareRequest = createRequest({
      headers: {
        "cf-connecting-ip": "203.0.113.9"
      }
    });
    expect(getClientIp(cloudflareRequest)).toBe("203.0.113.9");
  });
});
