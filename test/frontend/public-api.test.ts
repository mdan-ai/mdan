import { describe, expect, it } from "vitest";

import * as frontend from "../../src/frontend/index.js";

describe("frontend public api", () => {
  it("splits authoring helpers from browser runtime entrypoints", async () => {
    const authoring = await import("../../src/frontend/authoring.js");
    const runtime = await import("../../src/frontend/runtime.js");

    expect(authoring.createFrontend).toBeTypeOf("function");
    expect(authoring.defineFrontendModule).toBeTypeOf("function");
    expect(authoring.defineFormRenderer).toBeTypeOf("function");
    expect(authoring.html).toBeTypeOf("function");
    expect("mountMdanUi" in authoring).toBe(false);
    expect("bootEntry" in authoring).toBe(false);

    expect(runtime.mountMdanUi).toBeTypeOf("function");
    expect(runtime.bootEntry).toBeTypeOf("function");
    expect(runtime.autoBootEntry).toBeTypeOf("function");
    expect(runtime.registerMdanUi).toBeTypeOf("function");
    expect("defineFormRenderer" in runtime).toBe(false);
    expect("html" in runtime).toBe(false);
  });

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
