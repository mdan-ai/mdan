import { describe, expect, it } from "vitest";

import { getCookie, getHeader, getQueryParam } from "../src/index.js";
import type { MdanRequest } from "../src/server/types.js";

function createRequest(overrides: Partial<MdanRequest> = {}): MdanRequest {
  return {
    method: "GET",
    url: "https://example.test/path?foo=bar&locale=zh-CN",
    headers: {},
    cookies: {},
    ...overrides
  };
}

describe("request helpers", () => {
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

  it("falls back to cookie header when cookie map is missing", () => {
    const request = createRequest({
      headers: {
        cookie: "session=from-header; theme=dark"
      },
      cookies: undefined
    });
    expect(getCookie(request, "session")).toBe("from-header");
    expect(getCookie(request, "theme")).toBe("dark");
  });

  it("reads query values from request url", () => {
    const request = createRequest();
    expect(getQueryParam(request, "foo")).toBe("bar");
    expect(getQueryParam(request, "missing")).toBeNull();
  });
});
