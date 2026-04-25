import { describe, expect, it } from "vitest";

describe("form customization frontend example", () => {
  it("can be imported directly in local development", async () => {
    const module = await import("../../examples/form-customization/frontend.js");

    expect(module.default).toBeTruthy();
    expect(typeof module.default.autoBoot).toBe("function");
  });
});
