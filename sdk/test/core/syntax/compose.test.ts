import { describe, expect, it } from "vitest";

import { composePage as composePageFromCore } from "../../../src/core/index.js";
import { composePage } from "../../../src/core/syntax/index.js";

describe("composePage", () => {
  it("is the same implementation re-exported from the core entrypoint", () => {
    expect(composePage).toBe(composePageFromCore);
  });
});
