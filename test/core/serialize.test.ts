import { describe, expect, it } from "vitest";

import { serializeFragment, serializePage } from "../../src/content/serialize.js";

describe("serializePage", () => {
  it("serializes plain markdown and appends trailing newline", () => {
    const out = serializePage({
      frontmatter: {},
      markdown: "# Hello",
      blocks: []
    });

    expect(out).toBe("# Hello\n");
  });

  it("serializes scalar frontmatter fields", () => {
    const out = serializePage({
      frontmatter: {
        app_id: "auth-guestbook",
        state_version: 7,
        trusted: true,
        previous: null
      },
      markdown: "# Page",
      blocks: []
    });

    expect(out).toContain('app_id: "auth-guestbook"');
    expect(out).toContain("state_version: 7");
    expect(out).toContain("trusted: true");
    expect(out).toContain("previous: null");
    expect(out).toContain("---\n\n# Page\n");
  });

  it("filters hidden block anchors when visibleBlockNames is set", () => {
    const out = serializePage({
      frontmatter: {},
      markdown: [
        "# Guestbook",
        "",
        "<!-- mdan:block id=\"login\" -->",
        "",
        "<!-- mdan:block id=\"submit_message\" -->"
      ].join("\n"),
      blocks: [],
      visibleBlockNames: ["submit_message"]
    });

    expect(out).not.toContain("id=\"login\"");
    expect(out).toContain('<!-- mdan:block id="submit_message" -->');
  });

  it("writes block content into markdown block anchors without polluting executable JSON", () => {
    const out = serializePage({
      frontmatter: {},
      markdown: ["# Guestbook", "", "<!-- mdan:block id=\"submit_message\" -->"].join("\n"),
      blocks: [],
      blockContent: {
        submit_message: "## Leave a message"
      }
    });

    expect(out).toContain('<!-- mdan:block id="submit_message" -->');
    expect(out).toContain("# Guestbook\n\n<!-- mdan:block id=\"submit_message\" -->\n## Leave a message");
    expect(out).not.toContain('"regions": {');
    expect(out).not.toContain('"submit_message": "## Leave a message"');
  });

  it("appends block anchors when no block directives exist", () => {
    const out = serializePage({
      frontmatter: {},
      markdown: "# Guestbook",
      blocks: [],
      blockContent: {
        one: "## First",
        two: "## Second"
      }
    });

    expect(out).toContain("# Guestbook");
    expect(out).toContain('<!-- mdan:block id="one" -->\n\n## First');
    expect(out).toContain('<!-- mdan:block id="two" -->\n\n## Second');
    expect(out).not.toContain('"regions": {');
  });

  it("omits empty block values from readable markdown", () => {
    const out = serializePage({
      frontmatter: {},
      markdown: "# Guestbook",
      blocks: [],
      blockContent: {
        a: "   ",
        b: "## Visible"
      }
    });

    expect(out).not.toContain("\n\n\n");
    expect(out).not.toContain('"a"');
    expect(out).toContain('<!-- mdan:block id="b" -->\n\n## Visible');
    expect(out).not.toContain('"regions": {');
  });

  it("filters blockContent by visibleBlockNames", () => {
    const out = serializePage({
      frontmatter: {},
      markdown: [
        "# Guestbook",
        "",
        "<!-- mdan:block id=\"a\" -->",
        "",
        "<!-- mdan:block id=\"b\" -->"
      ].join("\n"),
      blocks: [],
      visibleBlockNames: ["b"],
      blockContent: {
        a: "## Hidden content",
        b: "## Visible content"
      }
    });

    expect(out).not.toContain("Hidden content");
    expect(out).toContain('<!-- mdan:block id="b" -->');
    expect(out).toContain("## Visible content");
    expect(out).not.toContain('"regions": {');
  });

  it("embeds executable JSON in a mdan fenced block", () => {
    const out = serializePage({
      frontmatter: {},
      markdown: "# Weather",
      executableContent: JSON.stringify(
        {
          actions: {
            query_weather: {
              target: "/weather/query"
            }
          }
        },
        null,
        2
      ),
      blocks: []
    });

    expect(out).toContain("```mdan");
    expect(out).toContain('"query_weather": {');
    expect(out).toContain('"target": "/weather/query"');
  });
});

describe("serializeFragment", () => {
  it("returns empty string for blank markdown", () => {
    expect(serializeFragment({ markdown: "   ", blocks: [] })).toBe("");
  });

  it("trims and appends trailing newline", () => {
    expect(serializeFragment({ markdown: "\n## Updated\n", blocks: [] })).toBe("## Updated\n");
  });

  it("includes a mdan block for fragment executable content", () => {
    const out = serializeFragment({
      markdown: "## Updated",
      executableContent: JSON.stringify({ actions: { refresh: {} } }, null, 2),
      blocks: []
    });

    expect(out).toContain("## Updated");
    expect(out).toContain("```mdan");
    expect(out).toContain('"refresh": {}');
  });
});
