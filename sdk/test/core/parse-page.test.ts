import { describe, expect, it } from "vitest";

import { parsePageLegacy as parsePage } from "../../src/core/index.js";

describe("parsePage", () => {
  it("extracts frontmatter, markdown, executable block, and anchors", () => {
    const page = parsePage(`---
title: Guestbook
---

# Guestbook

<!-- mdan:block guestbook -->

\`\`\`mdan
BLOCK guestbook {

  INPUT text -> nickname
  INPUT text required -> message
  GET "/list" -> refresh label:"Refresh"
  POST "/post" (nickname, message) -> submit label:"Submit"
}
\`\`\`
`);

    expect(page.frontmatter).toEqual({ title: "Guestbook" });
    expect(page.markdown).toContain("# Guestbook");
    expect(page.blocks).toHaveLength(1);
    expect(page.blocks[0]?.name).toBe("guestbook");
    expect(page.blockAnchors).toEqual(["guestbook"]);
  });

  it("ignores mdan-src blocks and anchor-like comments inside fenced code", () => {
    const page = parsePage(`# Demo

\`\`\`mdan-src
\`\`\`mdan
BLOCK fake {
  INPUT text -> value
}
\`\`\`
\`\`\`

\`\`\`ts
const value = "<!-- mdan:block fake -->";
\`\`\`

<!-- mdan:block real -->

\`\`\`mdan
BLOCK real {
  INPUT text -> value
  GET "/read" -> refresh
}
\`\`\`
`);

    expect(page.blocks).toHaveLength(1);
    expect(page.blocks[0]?.name).toBe("real");
    expect(page.blockAnchors).toEqual(["real"]);
  });

  it("parses every supported input type and modifier combination", () => {
    const page = parsePage(`# Compose

<!-- mdan:block compose -->

\`\`\`mdan
BLOCK compose {
  INPUT text -> title
  INPUT number required -> quantity
  INPUT boolean -> published
  INPUT choice ["draft", "published"] -> status
  INPUT asset required -> attachment
  INPUT text required secret -> password
  POST "/submit" (title, quantity, published, status, attachment, password) -> submit label:"Submit"
}
\`\`\`
`);

    expect(page.blocks[0]?.inputs).toEqual([
      { name: "title", type: "text", required: false, secret: false },
      { name: "quantity", type: "number", required: true, secret: false },
      { name: "published", type: "boolean", required: false, secret: false },
      { name: "status", type: "choice", required: false, secret: false, options: ["draft", "published"] },
      { name: "attachment", type: "asset", required: true, secret: false },
      { name: "password", type: "text", required: true, secret: true }
    ]);
  });

  it("parses choice options with commas and escaped quotes using JSON semantics", () => {
    const page = parsePage(`# Compose

<!-- mdan:block compose -->

\`\`\`mdan
BLOCK compose {
  INPUT choice ["draft,alpha", "say \\"hello\\""] -> status
  POST "/submit" (status) -> submit label:"Submit"
}
\`\`\`
`);

    expect(page.blocks[0]?.inputs).toEqual([
      { name: "status", type: "choice", required: false, secret: false, options: ["draft,alpha", 'say "hello"'] }
    ]);
  });

  it("rejects choice options when any option is not a string", () => {
    expect(() =>
      parsePage(`# Compose

<!-- mdan:block compose -->

\`\`\`mdan
BLOCK compose {
  INPUT choice ["draft", 1] -> status
  POST "/submit" (status) -> submit label:"Submit"
}
\`\`\`
`)
    ).toThrowError(/Invalid choice option/i);
  });

  it("accepts POST operations with an explicit empty input list", () => {
    const page = parsePage(`# Account

<!-- mdan:block auth -->

\`\`\`mdan
BLOCK auth {
  POST "/logout" () -> logout label:"Log Out"
}
\`\`\`
`);

    expect(page.blocks[0]?.operations).toEqual([
      {
        method: "POST",
        target: "/logout",
        name: "logout",
        inputs: [],
        auto: undefined,
        label: "Log Out",
        accept: undefined
      }
    ]);
  });

  it("parses explicit auto GET operations", () => {
    const page = parsePage(`# Guestbook

<!-- mdan:block guestbook -->

\`\`\`mdan
BLOCK guestbook {
  GET "/list" -> load_messages auto
}
\`\`\`
`);

    expect(page.blocks[0]?.operations).toEqual([
      {
        method: "GET",
        target: "/list",
        name: "load_messages",
        inputs: [],
        auto: true,
        label: undefined,
        accept: undefined
      }
    ]);
  });
});
