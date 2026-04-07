import { describe, expect, it } from "vitest";

import { composePage as composePageFromCore } from "../../../src/core/index.js";
import { composePage } from "../../../src/core/syntax/index.js";

describe("composePage", () => {
  it("is re-exported from the core entrypoint", () => {
    expect(composePageFromCore).toBeTypeOf("function");
  });

  it("composes a page with block content and visible blocks", () => {
    const page = composePage(`---
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
