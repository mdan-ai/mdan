import { describe, expect, it } from "vitest";

import * as surface from "../../src/surface/index.js";

describe("@mdanai/sdk/surface public API", () => {
  it("exposes only the headless runtime entrypoints", () => {
    expect(surface.createHeadlessHost).toBeTypeOf("function");
    expect("adaptReadableSurfaceToHeadlessSnapshot" in surface).toBe(false);
    expect("createSurfaceHost" in surface).toBe(false);
    expect("createWebRuntime" in surface).toBe(false);
    expect("adaptJsonEnvelopeToHeadlessSnapshot" in surface).toBe(false);
    expect("adaptJsonEnvelopeToHeadlessBootstrap" in surface).toBe(false);
  });
});
