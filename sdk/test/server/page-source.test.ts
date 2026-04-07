import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { composePage, serializePage } from "@mdanai/sdk/core";
import { describe, expect, it } from "vitest";

function renderGuestbookBlock(messages: string[]): string {
  const count = `${messages.length} live ${messages.length === 1 ? "message" : "messages"}`;
  const list = messages.map((message) => `- ${message}`).join("\n");
  return `## ${count}\n\n${list}`;
}

describe("canonical page source", () => {
  it("loads guestbook from a real markdown file and preserves current MDAN definitions", async () => {
    const filePath = join(process.cwd(), "examples", "guestbook", "app", "index.md");
    const source = await readFile(filePath, "utf8");
    const page = composePage(source, {
      blocks: {
        guestbook: renderGuestbookBlock(["Welcome to MDAN", "Hello again"])
      }
    });

    expect(page.markdown).not.toContain("2 live messages");
    expect(page.blocks[0]?.name).toBe("guestbook");
    expect(page.blockContent?.guestbook).toContain("2 live messages");
    expect(page.blockContent?.guestbook).toContain("- Welcome to MDAN");
    expect(serializePage(page)).toContain('POST submit "/post" WITH message LABEL "Submit"');
    expect(serializePage(page)).toContain("## 2 live messages");
  });
});
