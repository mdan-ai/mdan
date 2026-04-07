import { describe, expect, it } from "vitest";

import { composePageV2 as composePageV2FromCore } from "../../../src/core/index.js";
import { composePageV2 } from "../../../src/core/syntax-v2/index.js";

describe("composePageV2", () => {
  it("is re-exported from the core entrypoint", () => {
    expect(composePageV2FromCore).toBeTypeOf("function");
  });

  it("composes a v2 page with block content and visible blocks", () => {
    const page = composePageV2(`---
title: "Guestbook"
---

# Guestbook

<!-- mdan:block guestbook -->

\`\`\`mdan
BLOCK guestbook {
  INPUT message:text required
  GET refresh "/list" LABEL "Refresh"
  POST submit "/post" WITH message LABEL "Submit"
}
\`\`\``, {
      blocks: {
        guestbook: "## 2 live messages\n\n- Welcome\n- Hello"
      },
      visibleBlocks: ["guestbook"]
    });

    expect(page.frontmatter.title).toBe("Guestbook");
    expect(page.blocks[0]?.name).toBe("guestbook");
    expect(page.visibleBlockNames).toEqual(["guestbook"]);
    expect(page.blockContent?.guestbook).toContain("2 live messages");
    expect(typeof page.fragment).toBe("function");
    expect(page.fragment("guestbook").markdown).toContain("2 live messages");
  });
});
