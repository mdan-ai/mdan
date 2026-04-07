import { describe, expect, it } from "vitest";

import * as core from "../../src/core/index.js";
import { composePage } from "../../src/core/index.js";

describe("composePage", () => {
  it("keeps block extraction on the composed page instead of the package root API", () => {
    expect("fragmentForBlock" in core).toBe(false);
  });

  it("parses canonical source and applies runtime block markdown", () => {
    const page = composePage(
      `---
title: Guestbook
---

# Guestbook

<!-- mdan:block guestbook -->

\`\`\`mdan
BLOCK guestbook {
  INPUT message:text required
  POST submit "/post" WITH message LABEL "Submit"
}
\`\`\`
`,
      {
        blocks: {
          guestbook: "## 2 live messages\n\n- Welcome\n- Hello"
        }
      }
    );

    expect(page.frontmatter.title).toBe("Guestbook");
    expect(page.blockContent).toEqual({
      guestbook: "## 2 live messages\n\n- Welcome\n- Hello"
    });
    expect(page.blocks[0]?.name).toBe("guestbook");
  });

  it("validates page structure while composing", () => {
    expect(() =>
      composePage(`# Demo

<!-- mdan:block missing -->

\`\`\`mdan
BLOCK guestbook {
  GET refresh "/list"
}
\`\`\`
`)
    ).toThrow(/does not match any BLOCK/);
  });

  it("returns a composed page with a fragment helper for block-scoped responses", () => {
    const page = composePage(
      `# Guestbook

<!-- mdan:block guestbook -->

\`\`\`mdan
BLOCK guestbook {
  GET refresh "/list" LABEL "Refresh"
}
\`\`\`
`,
      {
        blocks: {
          guestbook: "## 1 live message\n\n- Welcome"
        }
      }
    );

    expect(page.fragment("guestbook")).toEqual({
      markdown: "## 1 live message\n\n- Welcome",
      blocks: [page.blocks[0]]
    });
  });

  it("can hide block definitions from the serialized page while keeping them internally available", () => {
    const page = composePage(
      `# Account

<!-- mdan:block auth -->

<!-- mdan:block vault -->

\`\`\`mdan
BLOCK auth {
  INPUT nickname:text
  INPUT password:text
  POST login "/login" WITH nickname, password LABEL "Sign In"
}

BLOCK vault {
  GET refresh "/notes" LABEL "Refresh Notes"
}
\`\`\`
`,
      {
        blocks: {
          auth: "## Please sign in",
          vault: "## 0 saved notes"
        },
        visibleBlocks: ["auth"]
      }
    );

    expect(page.blocks.map((block) => block.name)).toEqual(["auth", "vault"]);
    expect(page.visibleBlockNames).toEqual(["auth"]);
    expect(page.fragment("vault")).toEqual({
      markdown: "## 0 saved notes",
      blocks: [page.blocks[1]]
    });
  });
});

describe("page.fragment", () => {
  it("extracts a block-scoped fragment from a composed page", () => {
    const page = composePage(
      `# Guestbook

<!-- mdan:block guestbook -->

\`\`\`mdan
BLOCK guestbook {
  INPUT message:text required
  GET refresh "/list" LABEL "Refresh"
  POST submit "/post" WITH message LABEL "Submit"
}
\`\`\`
`,
      {
        blocks: {
          guestbook: "## 3 live messages\n\n- Welcome\n- Hello\n- Hi"
        }
      }
    );

    expect(page.fragment("guestbook")).toEqual({
      markdown: "## 3 live messages\n\n- Welcome\n- Hello\n- Hi",
      blocks: [page.blocks[0]]
    });
  });

  it("throws when the requested block does not exist", () => {
    const page = composePage(
      `# Guestbook

<!-- mdan:block guestbook -->

\`\`\`mdan
BLOCK guestbook {
  GET refresh "/list" LABEL "Refresh"
}
\`\`\`
`
    );

    expect(() => page.fragment("missing")).toThrow(/Unknown block "missing"/);
  });

  it("throws when the block exists but no runtime content was composed", () => {
    const page = composePage(
      `# Guestbook

<!-- mdan:block guestbook -->

\`\`\`mdan
BLOCK guestbook {
  GET refresh "/list" LABEL "Refresh"
}
\`\`\`
`
    );

    expect(() => page.fragment("guestbook")).toThrow(/Block "guestbook" has no composed markdown content/);
  });
});
