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
    expect(html).toContain("<ul><li>first</li><li>second</li></ul>");
  });

  it("escapes unsafe html characters", () => {
    const html = basicMarkdownRenderer.render('# <script>alert("x")</script>');
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
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

    expect(html).toBe("<h1>Login</h1>");
  });

  it("ignores fenced code blocks and mdan anchors", () => {
    const html = basicMarkdownRenderer.render([
      "# Title",
      "",
      "```ts",
      "console.log('secret');",
      "```",
      "",
      "<!-- mdan:block login -->",
      "",
      "Visible paragraph"
    ].join("\n"));

    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<p>Visible paragraph</p>");
    expect(html).not.toContain("console.log");
    expect(html).not.toContain("mdan:block");
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
    expect(html).toBe("<h2>Section</h2>");
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
    expect(html).toBe("<p>line one line two</p>");
  });

  it("returns empty output for blank markdown", () => {
    expect(basicMarkdownRenderer.render("\n\n")).toBe("");
  });
});
