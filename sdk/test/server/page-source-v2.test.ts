import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { composePageV2, serializePageV2 } from "../../src/core/syntax-v2/index.js";

function renderGuestbookBlock(messages: string[]): string {
  const count = `${messages.length} live ${messages.length === 1 ? "message" : "messages"}`;
  const list = messages.map((message) => `- ${message}`).join("\n");
  return `## ${count}\n\n${list}`;
}

describe("canonical v2 page source", () => {
  it("composes and serializes a v2 page source in canonical v2 syntax", async () => {
    const filePath = join(process.cwd(), "examples", "guestbook", "app", "index.md");
    const legacySource = await readFile(filePath, "utf8");
    expect(legacySource).toContain('INPUT text required -> message');

    const source = `---
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
\`\`\``;
    const page = composePageV2(source, {
      blocks: {
        guestbook: renderGuestbookBlock(["Welcome to MDAN", "Hello again"])
      }
    });

    expect(page.markdown).not.toContain("2 live messages");
    expect(page.blocks[0]?.name).toBe("guestbook");
    expect(page.blockContent?.guestbook).toContain("2 live messages");
    expect(serializePageV2(page)).toContain('INPUT message:text required');
    expect(serializePageV2(page)).toContain('POST submit "/post" WITH message LABEL "Submit"');
    expect(serializePageV2(page)).toContain("## 2 live messages");
  });
});
