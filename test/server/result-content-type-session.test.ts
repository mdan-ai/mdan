import { describe, expect, it } from "vitest";

import { toMarkdownContentType } from "../../src/server/content-type.js";
import { fail, ok, stream } from "../../src/server/result.js";
import { refreshSession, signIn, signOut } from "../../src/server/session.js";

describe("toMarkdownContentType", () => {
  it("uses default mdan profile", () => {
    expect(toMarkdownContentType()).toBe('text/markdown; profile="https://mdan.ai/spec/v1"');
  });

  it("allows overriding markdown profile", () => {
    expect(toMarkdownContentType("https://example.test/custom")).toBe(
      'text/markdown; profile="https://example.test/custom"'
    );
  });
});

describe("result helpers", () => {
  it("ok defaults status to 200 and preserves page payload", () => {
    const result = ok({
      page: {
        frontmatter: {},
        markdown: "# Page",
        blocks: []
      }
    });

    expect(result.status).toBe(200);
    expect(result.page?.markdown).toBe("# Page");
  });

  it("fail defaults status to 400 but can be overridden", () => {
    expect(fail({ fragment: { markdown: "## Bad", blocks: [] } }).status).toBe(400);
    expect(fail({ status: 422, fragment: { markdown: "## Bad", blocks: [] } }).status).toBe(422);
  });

  it("stream returns status 200 with iterable source", async () => {
    async function* source() {
      yield { markdown: "chunk-1" };
      yield { markdown: "chunk-2" };
    }

    const result = stream(source(), { route: "/next" });
    expect(result.status).toBe(200);
    expect(result.route).toBe("/next");

    const values: string[] = [];
    for await (const chunk of result.stream) {
      values.push(chunk.markdown);
    }
    expect(values).toEqual(["chunk-1", "chunk-2"]);
  });
});

describe("session helpers", () => {
  it("creates sign-in mutation", () => {
    expect(signIn({ sid: "s1", user: "ada" })).toEqual({
      type: "sign-in",
      session: { sid: "s1", user: "ada" }
    });
  });

  it("creates refresh mutation", () => {
    expect(refreshSession({ sid: "s1", user: "ada" })).toEqual({
      type: "refresh",
      session: { sid: "s1", user: "ada" }
    });
  });

  it("creates sign-out mutation", () => {
    expect(signOut()).toEqual({ type: "sign-out" });
  });
});
