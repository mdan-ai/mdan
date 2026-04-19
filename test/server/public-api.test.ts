import { describe, expect, it } from "vitest";

import * as server from "../../src/server/index.js";

describe("@mdanai/sdk/server public API", () => {
  it("exports server runtime and validation helpers", () => {
    expect(server.createMdanServer).toBeTypeOf("function");
    expect(server.validatePostInputs).toBeTypeOf("function");
    expect(server.normalizeUrlEncodedBody).toBeTypeOf("function");
    expect(server.normalizeMultipartBody).toBeTypeOf("function");
    expect(server.renderBrowserShell).toBeTypeOf("function");
    expect(server.resolveLocalBrowserModule).toBeTypeOf("function");
    expect(server.shouldServeBrowserShell).toBeTypeOf("function");
    expect(server.ok).toBeTypeOf("function");
    expect(server.fail).toBeTypeOf("function");
    expect(server.stream).toBeTypeOf("function");
  });
});
