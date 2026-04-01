import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("docs-site discovery files", () => {
  it("ships crawl instructions for search and AI clients", async () => {
    const robots = await readFile(resolve(process.cwd(), "docs-site/public/robots.txt"), "utf8");
    const llms = await readFile(resolve(process.cwd(), "docs-site/public/llms.txt"), "utf8");
    const sitemap = await readFile(resolve(process.cwd(), "docs-site/public/sitemap.xml"), "utf8");

    expect(robots).toContain("User-agent: OAI-SearchBot");
    expect(robots).toContain("Sitemap: https://docs.mdsn.ai/sitemap.xml");

    expect(llms).toContain("MDSN is a Markdown-first framework for building apps that humans and AI agents can both use.");
    expect(llms).toContain("https://docs.mdsn.ai/getting-started");
    expect(llms).toContain("https://www.npmjs.com/package/@mdsnai/sdk");

    expect(sitemap).toContain("<loc>https://docs.mdsn.ai/</loc>");
    expect(sitemap).toContain("<loc>https://docs.mdsn.ai/what-is-mdsn</loc>");
    expect(sitemap).toContain("<loc>https://docs.mdsn.ai/mdsn-vs-mcp</loc>");
    expect(sitemap).toContain("<loc>https://docs.mdsn.ai/zh/getting-started</loc>");
  });
});
