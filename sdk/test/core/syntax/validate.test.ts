import { describe, expect, it } from "vitest";

import { validatePage } from "../../../src/core/syntax/index.js";
import type { MdanPage } from "../../../src/core/types.js";

describe("validatePage", () => {
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

    expect(() => validatePage(page)).toThrow(/Duplicate operation "sign_in"/);
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

    expect(() => validatePage(page)).toThrow(/must not declare AUTO/i);
  });
});
