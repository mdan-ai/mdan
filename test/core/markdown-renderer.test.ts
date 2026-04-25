import { describe, expect, it } from "vitest";

import { basicMarkdownRenderer } from "../../src/content/markdown-renderer.js";

describe("basicMarkdownRenderer", () => {
  it("renders heading, paragraph, and list nodes", () => {
    const html = basicMarkdownRenderer.render([
      "# Guestbook",
      "",
      "Welcome to the board.",
      "",
      "- first",
      "- second"
    ].join("\n"));

    expect(html).toContain("<h1>Guestbook</h1>");
    expect(html).toContain("<p>Welcome to the board.</p>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>first</li>");
    expect(html).toContain("<li>second</li>");
  });

  it("escapes unsafe html characters", () => {
    const html = basicMarkdownRenderer.render('# <script>alert("x")</script>');
    expect(html).toContain("&lt;script&gt;alert(\"x\")&lt;/script&gt;");
  });

  it("removes frontmatter before rendering", () => {
    const html = basicMarkdownRenderer.render([
      "---",
      "app_id: \"auth\"",
      "state: 1",
      "---",
      "",
      "# Login"
    ].join("\n"));

    expect(html.trim()).toBe("<h1>Login</h1>");
  });

  it("renders fenced code blocks", () => {
    const html = basicMarkdownRenderer.render([
      "# Title",
      "",
      "```ts",
      "console.log('secret');",
      "```",
      "",
      "Visible paragraph"
    ].join("\n"));

    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<pre><code");
    expect(html).toContain("console.log");
    expect(html).toContain("<p>Visible paragraph</p>");
  });

  it("hides agent-only blocks from rendered html", () => {
    const html = basicMarkdownRenderer.render([
      "# Title",
      "",
      "Visible intro",
      "",
      "<!-- agent:begin id=\"planner\" -->",
      "## Rules",
      "Agent-only rule",
      "<!-- agent:end -->",
      "",
      "Visible outro"
    ].join("\n"));

    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<p>Visible intro</p>");
    expect(html).toContain("<p>Visible outro</p>");
    expect(html).not.toContain("Agent-only rule");
    expect(html).not.toContain("planner");
  });

  it("treats ## headings as h2", () => {
    const html = basicMarkdownRenderer.render("## Section");
    expect(html.trim()).toBe("<h2>Section</h2>");
  });

  it("renders h2 headings separately from the following paragraph body", () => {
    const html = basicMarkdownRenderer.render([
      "## Purpose",
      "Authenticate with an existing account.",
      "",
      "## Context",
      "This page is the unauthenticated entry point."
    ].join("\n"));

    expect(html).toContain("<h2>Purpose</h2>");
    expect(html).toContain("<p>Authenticate with an existing account.</p>");
    expect(html).toContain("<h2>Context</h2>");
    expect(html).toContain("<p>This page is the unauthenticated entry point.</p>");
    expect(html).not.toContain("<h2>Purpose Authenticate");
    expect(html).not.toContain("<h2>Context This page");
  });

  it("collapses single-line paragraph chunks", () => {
    const html = basicMarkdownRenderer.render("line one\nline two");
    expect(html).toContain("<p>line one");
    expect(html).toContain("line two</p>");
  });

  it("returns empty output for blank markdown", () => {
    expect(basicMarkdownRenderer.render("\n\n")).toBe("");
  });

  it("renders tables, links, and inline code", () => {
    const html = basicMarkdownRenderer.render([
      "| city | temp |",
      "| --- | --- |",
      "| Paris | 18 |",
      "",
      "Use `weather.lookup` and [forecast](/forecast)."
    ].join("\n"));

    expect(html).toContain("<table>");
    expect(html).toContain("<code>weather.lookup</code>");
    expect(html).toContain('<a href="/forecast">forecast</a>');
  });
});
