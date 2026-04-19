import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  getStaticContentType,
  isFormEncodedContentType,
  normalizeMultipartBody,
  normalizeUrlEncodedBody,
  parseCookies,
  resolveLocalBrowserModule,
  resolveMountedFile
} from "../../src/server/adapter-shared.js";

describe("parseCookies", () => {
  it("returns empty object for empty cookie header", () => {
    expect(parseCookies(undefined)).toEqual({});
    expect(parseCookies(null)).toEqual({});
    expect(parseCookies("   ")).toEqual({});
  });

  it("parses multiple cookie pairs", () => {
    expect(parseCookies("sid=abc; theme=dark")).toEqual({
      sid: "abc",
      theme: "dark"
    });
  });

  it("keeps malformed uri encoding without throwing", () => {
    expect(parseCookies("bad=%E0%A4%A")).toEqual({ bad: "%E0%A4%A" });
  });

  it("supports equals signs in cookie value", () => {
    expect(parseCookies("token=abc=def==; x=1")).toEqual({
      token: "abc=def==",
      x: "1"
    });
  });
});

describe("isFormEncodedContentType", () => {
  it.each([
    "application/x-www-form-urlencoded",
    "application/x-www-form-urlencoded; charset=utf-8",
    "multipart/form-data; boundary=abc"
  ])("accepts supported content type: %s", (contentType) => {
    expect(isFormEncodedContentType(contentType)).toBe(true);
  });

  it.each(["text/plain", "application/json", undefined, null])(
    "rejects unsupported content type: %s",
    (contentType) => {
      expect(isFormEncodedContentType(contentType as string | null | undefined)).toBe(false);
    }
  );
});

describe("normalizeUrlEncodedBody", () => {
  it("converts urlencoded form payload into json-body format", () => {
    const body = normalizeUrlEncodedBody("message=hello+world&nickname=ada");
    expect(JSON.parse(body)).toEqual({
      message: "hello world",
      nickname: "ada"
    });
  });
});

describe("normalizeMultipartBody", () => {
  it("normalizes multipart text and file fields", async () => {
    const form = new FormData();
    form.set("message", "hello multipart");
    form.set("attachment", new File(["hello"], "hello.txt", { type: "text/plain" }));

    const request = new Request("https://example.test", {
      method: "POST",
      body: form
    });

    const contentType = request.headers.get("content-type");
    expect(contentType).toBeTruthy();
    const rawBody = await request.text();

    const normalized = await normalizeMultipartBody(rawBody, String(contentType));
    const parsed = JSON.parse(normalized) as Record<string, unknown>;

    expect(parsed.message).toBe("hello multipart");
    expect(parsed.attachment).toMatchObject({
      kind: "asset",
      id: expect.stringMatching(/^ast_/),
      name: "hello.txt",
      mime: "text/plain",
      size: 5,
      storage: "local",
      path: expect.stringContaining(".mdan/assets/"),
      sha256: expect.any(String)
    });
  });

  it("normalizes empty file uploads into zero-sized asset handles", async () => {
    const form = new FormData();
    form.set("attachment", new File([], "empty.txt", { type: "text/plain" }));

    const request = new Request("https://example.test", {
      method: "POST",
      body: form
    });

    const contentType = request.headers.get("content-type");
    expect(contentType).toBeTruthy();
    const rawBody = await request.text();

    const normalized = await normalizeMultipartBody(rawBody, String(contentType));
    const parsed = JSON.parse(normalized) as Record<string, any>;

    expect(parsed.attachment).toMatchObject({
      kind: "asset",
      name: "empty.txt",
      mime: "text/plain",
      size: 0,
      storage: "local",
      sha256: expect.any(String)
    });
  });
});

describe("getStaticContentType", () => {
  it.each([
    ["/app.js", "text/javascript"],
    ["/app.mjs", "text/javascript"],
    ["/app.css", "text/css"],
    ["/map.json", "application/json"],
    ["/map.map", "application/json"],
    ["/index.html", "text/html"],
    ["/image.svg", "image/svg+xml"],
    ["/note.txt", "text/plain"],
    ["/asset.bin", "application/octet-stream"]
  ])("maps extension %s -> %s", (path, expected) => {
    expect(getStaticContentType(path)).toBe(expected);
  });
});

describe("resolveMountedFile", () => {
  it("resolves mounted path inside prefixed mount", () => {
    const resolved = resolveMountedFile("/tmp/site", "/assets", "/assets/app.js");
    expect(resolved).toBe("/tmp/site/app.js");
  });

  it("returns null when pathname is outside mount prefix", () => {
    const resolved = resolveMountedFile("/tmp/site", "/assets", "/public/app.js");
    expect(resolved).toBeNull();
  });

  it("blocks directory traversal for prefixed mounts", () => {
    const resolved = resolveMountedFile("/tmp/site", "/assets", "/assets/../secret.txt");
    expect(resolved).toBeNull();
  });

  it("supports root mount and still blocks traversal", () => {
    expect(resolveMountedFile("/tmp/site", "/", "/docs/readme.md")).toBe("/tmp/site/docs/readme.md");
    expect(resolveMountedFile("/tmp/site", "/", "/../escape.md")).toBeNull();
  });
});

describe("resolveLocalBrowserModule", () => {
  it("resolves package browser bundles independently from the host cwd", async () => {
    const previousCwd = process.cwd();
    const hostCwd = await mkdtemp(join(tmpdir(), "mdan-host-"));
    try {
      process.chdir(hostCwd);
      expect(resolveLocalBrowserModule("/__mdan/surface.js", { moduleMode: "local-dist" })).toBe(
        join(previousCwd, "dist-browser", "surface.js")
      );
      expect(resolveLocalBrowserModule("/__mdan/ui.js", { moduleMode: "local-dist" })).toBe(
        join(previousCwd, "dist-browser", "ui.js")
      );
    } finally {
      process.chdir(previousCwd);
    }
  });
});
