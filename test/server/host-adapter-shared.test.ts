import { describe, expect, it } from "vitest";

import {
  finalizeMdanHeaders,
  normalizeDecodedBody,
  toMdanMethod
} from "../../src/server/host-adapter-shared.js";

describe("normalizeDecodedBody", () => {
  it("passes through json payloads without rewriting", async () => {
    await expect(
      normalizeDecodedBody('{"message":"hello"}', "application/json")
    ).resolves.toBe('{"message":"hello"}');
  });

  it("normalizes urlencoded form payloads into json", async () => {
    await expect(
      normalizeDecodedBody("message=hello+world&count=4", "application/x-www-form-urlencoded")
    ).resolves.toBe('{"message":"hello world","count":"4"}');
  });
});

describe("finalizeMdanHeaders", () => {
  it("defaults accept to json and rewrites form submissions to json content-type", () => {
    expect(
      finalizeMdanHeaders({
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        },
        body: '{"message":"hello"}'
      })
    ).toEqual({
      accept: "application/json",
      "content-type": "application/json"
    });
  });

  it("preserves explicit accept values when body is absent", () => {
    expect(
      finalizeMdanHeaders({
        headers: {
          accept: "text/html"
        }
      })
    ).toEqual({
      accept: "text/html"
    });
  });
});

describe("toMdanMethod", () => {
  it.each([
    ["POST", "POST"],
    ["GET", "GET"],
    ["PUT", "GET"],
    [undefined, "GET"]
  ])("maps %s to %s", (input, expected) => {
    expect(toMdanMethod(input)).toBe(expected);
  });
});
