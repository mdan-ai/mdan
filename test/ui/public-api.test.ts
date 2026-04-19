import { describe, expect, it } from "vitest";

import * as ui from "../../src/ui/index.js";

describe("@mdanai/sdk/ui public API", () => {
  it("exposes the default UI entrypoints", () => {
    expect(ui.mountMdanUi).toBeTypeOf("function");
    expect(ui.registerMdanUi).toBeTypeOf("function");
  });
});
