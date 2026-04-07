import { describe, expect, it } from "vitest";

import { validatePageV2 } from "../../../src/core/syntax-v2/index.js";
import type { MdanPage } from "../../../src/core/types.js";

describe("validatePageV2", () => {
  it("rejects duplicate operation names in the same block", () => {
    const page: MdanPage = {
      frontmatter: {},
      markdown: "# Login\n\n<!-- mdan:block login -->",
      blocks: [
        {
          name: "login",
          inputs: [{ name: "nickname", type: "text", required: false, secret: false }],
          operations: [
            { method: "GET", name: "sign_in", target: "/login", inputs: [] },
            { method: "POST", name: "sign_in", target: "/login", inputs: ["nickname"] }
          ]
        }
      ],
      blockAnchors: ["login"]
    };

    expect(() => validatePageV2(page)).toThrow(/Duplicate operation "sign_in"/);
  });

  it("rejects AUTO on POST operations", () => {
    const page: MdanPage = {
      frontmatter: {},
      markdown: "# Login\n\n<!-- mdan:block login -->",
      blocks: [
        {
          name: "login",
          inputs: [],
          operations: [{ method: "POST", name: "logout", target: "/logout", inputs: [], auto: true }]
        }
      ],
      blockAnchors: ["login"]
    };

    expect(() => validatePageV2(page)).toThrow(/must not declare AUTO/i);
  });
});
