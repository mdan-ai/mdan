import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("docs-site discovery files", () => {
  it("ships crawl instructions for search and AI clients", async () => {
    const robots = await readFile(resolve(process.cwd(), "docs-site/public/robots.txt"), "utf8");
    const llms = await readFile(resolve(process.cwd(), "docs-site/public/llms.txt"), "utf8");
    const sitemap = await readFile(resolve(process.cwd(), "docs-site/public/sitemap.xml"), "utf8");

    expect(robots).toContain("User-agent: OAI-SearchBot");
    expect(robots).toContain("Sitemap: https://docs.mdan.ai/sitemap.xml");

    expect(llms).toContain("One page for humans and agents.");
    expect(llms).toContain(
      "MDAN (Markdown Action Notation) is a shared notation for interactive pages that stay readable and actionable for both humans and agents, from the same source, across any interface."
    );
    expect(llms).toContain("https://docs.mdan.ai/getting-started");
    expect(llms).toContain("https://www.npmjs.com/package/@mdanai/sdk");

    expect(sitemap).toContain("<loc>https://docs.mdan.ai/</loc>");
    expect(sitemap).toContain("<loc>https://docs.mdan.ai/what-is-mdan</loc>");
    expect(sitemap).toContain("<loc>https://docs.mdan.ai/mdan-vs-mcp</loc>");
    expect(sitemap).toContain("<loc>https://docs.mdan.ai/zh/getting-started</loc>");
  });
});
