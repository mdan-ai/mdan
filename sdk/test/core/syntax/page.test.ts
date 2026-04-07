import { describe, expect, it } from "vitest";

import { parsePage as parsePageFromCore } from "../../../src/core/index.js";
import { parsePage } from "../../../src/core/syntax/index.js";

describe("parsePage", () => {
  it("is the same implementation re-exported from the core entrypoint", () => {
    expect(parsePage).toBe(parsePageFromCore);
  });
});
