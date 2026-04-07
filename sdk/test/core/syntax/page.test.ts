import { describe, expect, it } from "vitest";

import { parsePage } from "../../../src/core/syntax/index.js";

describe("parsePage", () => {
  it("extracts frontmatter, anchors, markdown, and executable blocks", () => {
    const page = parsePage(`---
title: Login
---

# Login

<!-- mdan:block login -->

\`\`\`mdan
BLOCK login {
  INPUT nickname:text required
  INPUT password:text required secret
  POST sign_in "/login"
    WITH nickname, password
    LABEL "Sign In"
}
\`\`\`
`);

    expect(page.frontmatter).toEqual({ title: "Login" });
    expect(page.blockAnchors).toEqual(["login"]);
    expect(page.blocks[0]?.inputs[0]?.name).toBe("nickname");
    expect(page.blocks[0]?.operations[0]?.name).toBe("sign_in");
  });
});
