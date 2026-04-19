import { describe, expect, it } from "vitest";

import * as surface from "../../src/surface/index.js";

describe("@mdanai/sdk/surface public API", () => {
  it("exposes browser runtime entries and surface adapters", () => {
    expect(surface.createHeadlessHost).toBeTypeOf("function");
    expect(surface.adaptJsonEnvelopeToHeadlessSnapshot).toBeTypeOf("function");
    expect(surface.adaptJsonEnvelopeToHeadlessBootstrap).toBeTypeOf("function");
    expect("createSurfaceHost" in surface).toBe(false);
    expect("createWebRuntime" in surface).toBe(false);
  });
});
