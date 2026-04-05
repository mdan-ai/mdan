import { describe, expect, it } from "vitest";

import * as web from "../../src/web/index.js";

describe("@mdanai/sdk/web public API", () => {
  it("only exposes the headless runtime entry", () => {
    expect(web.createHeadlessHost).toBeTypeOf("function");
    expect("createWebRuntime" in web).toBe(false);
  });
});
