// @vitest-environment node

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createGuestbookServer } from "../../../examples/guestbook/app/server.js";
import { createHost } from "@mdsnai/sdk/server/bun";

describe("bun guestbook adapter", () => {
  it("keeps the guestbook self-discoverable over the Bun host adapter", async () => {
    const source = await readFile(join(process.cwd(), "examples", "guestbook", "app", "index.md"), "utf8");
    const app = createGuestbookServer({
      source,
      initialMessages: ["Alpha", "Beta"]
    });
    const host = createHost(app);

    const page = await host(
      new Request("https://example.test/", {
        headers: { accept: "text/markdown" }
      })
    );
    expect(page.status).toBe(200);
    const pageBody = await page.text();
    expect(pageBody).toContain("## 2 live messages");
    expect(pageBody).toContain('POST "/post" (message) -> submit');

    const save = await host(
      new Request("https://example.test/post", {
        method: "POST",
        headers: {
          accept: "text/markdown",
          "content-type": "text/markdown"
        },
        body: 'message: "Hello from Bun smoke"'
      })
    );
    expect(save.status).toBe(200);
    await expect(save.text()).resolves.toContain("Hello from Bun smoke");
  });
});
