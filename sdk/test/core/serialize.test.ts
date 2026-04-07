import { describe, expect, it } from "vitest";

import { serializeFragment, serializePage, type MdanFragment, type MdanPage } from "../../src/core/index.js";

describe("serializePage", () => {
  it("serializes frontmatter, markdown, and executable blocks", () => {
    const page: MdanPage = {
      frontmatter: {
        title: "Guestbook"
      },
      markdown: "# Guestbook\n\n<!-- mdan:block guestbook -->",
      blockContent: {
        guestbook: "## 2 live messages\n\n- Welcome\n- Hello"
      },
      blocks: [
        {
          name: "guestbook",
          inputs: [
            { name: "nickname", type: "text", required: false, secret: false },
            { name: "message", type: "text", required: true, secret: false }
          ],
          operations: [
            {
              method: "GET",
              target: "/list",
              name: "refresh",
              inputs: [],
              label: "Refresh"
            },
            {
              method: "POST",
              target: "/post",
              name: "submit",
              inputs: ["nickname", "message"],
              label: "Submit"
            }
          ]
        }
      ],
      blockAnchors: ["guestbook"]
    };

    expect(serializePage(page)).toBe(`---
title: "Guestbook"
---

# Guestbook

## 2 live messages

- Welcome
- Hello

<!-- mdan:block guestbook -->

\`\`\`mdan
BLOCK guestbook {
  INPUT nickname:text
  INPUT message:text required
  GET refresh "/list" LABEL "Refresh"
  POST submit "/post" WITH nickname, message LABEL "Submit"
}
\`\`\`
`);
  });

  it("serializes every supported input type with its modifiers", () => {
    const page: MdanPage = {
      frontmatter: {},
      markdown: "# Compose\n\n<!-- mdan:block compose -->",
      blockContent: {
        compose: "## Draft"
      },
      blocks: [
        {
          name: "compose",
          inputs: [
            { name: "title", type: "text", required: false, secret: false },
            { name: "quantity", type: "number", required: true, secret: false },
            { name: "published", type: "boolean", required: false, secret: false },
            { name: "status", type: "choice", required: false, secret: false, options: ["draft", "published"] },
            { name: "attachment", type: "asset", required: true, secret: false },
            { name: "password", type: "text", required: true, secret: true }
          ],
          operations: [
            {
              method: "POST",
              target: "/submit",
              name: "submit",
              inputs: ["title", "quantity", "published", "status", "attachment", "password"],
              label: "Submit"
            }
          ]
        }
      ],
      blockAnchors: ["compose"]
    };

    const markdown = serializePage(page);
    expect(markdown).toContain('INPUT title:text');
    expect(markdown).toContain('INPUT quantity:number required');
    expect(markdown).toContain('INPUT published:boolean');
    expect(markdown).toContain('INPUT status:choice ["draft", "published"]');
    expect(markdown).toContain('INPUT attachment:asset required');
    expect(markdown).toContain('INPUT password:text required secret');
  });

  it("only serializes currently visible blocks for page responses", () => {
    const page: MdanPage = {
      frontmatter: {
        title: "Account"
      },
      markdown: "# Account\n\n<!-- mdan:block auth -->\n\n<!-- mdan:block vault -->",
      blockContent: {
        auth: "## Please sign in",
        vault: "## 0 saved notes"
      },
      blocks: [
        {
          name: "auth",
          inputs: [{ name: "nickname", type: "text", required: true, secret: false }],
          operations: [{ method: "POST", target: "/login", name: "login", inputs: ["nickname"], label: "Sign In" }]
        },
        {
          name: "vault",
          inputs: [{ name: "message", type: "text", required: true, secret: false }],
          operations: [{ method: "POST", target: "/notes", name: "save", inputs: ["message"], label: "Save Note" }]
        }
      ],
      blockAnchors: ["auth", "vault"],
      visibleBlockNames: ["auth"]
    };

    const markdown = serializePage(page);
    expect(markdown).toContain("## Please sign in");
    expect(markdown).toContain("BLOCK auth");
    expect(markdown).not.toContain("BLOCK vault");
    expect(markdown).not.toContain('POST save "/notes" WITH message');
    expect(markdown).not.toContain("<!-- mdan:block vault -->");
  });
});

describe("serializeFragment", () => {
  it("serializes markdown and blocks without frontmatter", () => {
    const fragment: MdanFragment = {
      markdown: "## Messages",
      blocks: [
        {
          name: "messages",
          inputs: [],
          operations: [{ method: "GET", target: "/messages", name: "refresh", inputs: [], label: "Refresh" }]
        }
      ]
    };

    expect(serializeFragment(fragment)).toBe(`## Messages

\`\`\`mdan
BLOCK messages {
  GET refresh "/messages" LABEL "Refresh"
}
\`\`\`
`);
  });

  it("serializes explicit AUTO GET operations", () => {
    const fragment: MdanFragment = {
      markdown: "## Messages",
      blocks: [
        {
          name: "messages",
          inputs: [],
          operations: [{ method: "GET", target: "/messages", name: "load_messages", inputs: [], auto: true }]
        }
      ]
    };

    expect(serializeFragment(fragment)).toBe(`## Messages

\`\`\`mdan
BLOCK messages {
  GET load_messages "/messages" AUTO
}
\`\`\`
`);
  });
});
