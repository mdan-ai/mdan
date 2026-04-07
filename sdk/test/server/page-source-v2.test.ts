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
  it("loads the real guestbook page source and serializes it in canonical v2 syntax", async () => {
    const filePath = join(process.cwd(), "examples", "guestbook", "app", "index.md");
    const source = await readFile(filePath, "utf8");
    expect(source).toContain('INPUT message:text required');
    expect(source).toContain('GET refresh "/list" LABEL "Refresh"');
    expect(source).toContain('POST submit "/post" WITH message LABEL "Submit"');

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
