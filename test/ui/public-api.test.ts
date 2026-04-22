import { describe, expect, it } from "vitest";

import * as ui from "../../src/ui/index.js";

describe("internal ui module", () => {
  it("keeps the default UI entrypoints available for internal browser bundles", () => {
    expect(ui.mountMdanUi).toBeTypeOf("function");
    expect(ui.registerMdanUi).toBeTypeOf("function");
  });
});
