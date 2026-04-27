import { describe, expect, it } from "vitest";

import * as frontend from "../../src/frontend/index.js";

describe("frontend public api", () => {
  it("exposes the default frontend entrypoints without leaking ui internals", () => {
    expect(frontend.createFrontend).toBeTypeOf("function");
    expect(frontend.defineFrontendModule).toBeTypeOf("function");
    expect(frontend.mountMdanUi).toBeTypeOf("function");
    expect(frontend.bootEntry).toBeTypeOf("function");
    expect(frontend.autoBootEntry).toBeTypeOf("function");
    expect(frontend.registerMdanUi).toBeTypeOf("function");
    expect(frontend.defineFormRenderer).toBeTypeOf("function");
    expect(frontend.defaultUiFormRenderer).toBeTypeOf("object");
    expect("resolveUiSnapshotView" in frontend).toBe(false);
    expect("submitUiOperation" in frontend).toBe(false);
  });
});
