import { describe, expect, it } from "vitest";

import { parseMarkdownSurface } from "../../src/content/readable-markdown.js";
import { createMarkdownFragment, createMarkdownPage, createExecutableContent } from "../../src/core/surface/markdown.js";

describe("markdown surface helpers", () => {
  it("serializes executable JSON with stable indentation", () => {
    expect(
      createExecutableContent({
        app_id: "demo"
      })
    ).toBe('{\n  "app_id": "demo"\n}');
  });

  it("builds a page and infers visible block names from block content and blocks", () => {
    const page = createMarkdownPage({
      markdown: "# Demo\n\n<!-- mdan:block id=\"main\" -->",
      executableJson: { app_id: "demo" },
      blockContent: {
        secondary: "## Secondary"
      },
      blocks: [
        {
          name: "main",
          inputs: [],
          operations: []
        }
      ]
    });

    expect(page.executableContent).toContain('"app_id": "demo"');
    expect(page.visibleBlockNames).toEqual(["main", "secondary"]);
  });

  it("builds a fragment with executable JSON", () => {
    const fragment = createMarkdownFragment({
      markdown: "## Saved",
      executableJson: { actions: { refresh: {} } }
    });

    expect(fragment.markdown).toBe("## Saved");
    expect(fragment.executableContent).toContain('"refresh": {}');
    expect(fragment.blocks).toEqual([]);
  });

  it("parses the last executable mdan block while preserving earlier example fences", () => {
    const markdown = `# Docs

\`\`\`mdan
not valid json
\`\`\`

## Example

\`\`\`mdan
{
  "app_id": "demo",
  "actions": {}
}
\`\`\`
`;

    const surface = parseMarkdownSurface(markdown);

    expect(surface).toMatchObject({
      actions: {
        app_id: "demo",
        actions: {}
      }
    });
    expect(surface?.markdown).toContain("not valid json");
    expect(surface?.markdown).not.toContain('"app_id": "demo"');
  });

  it("can treat plain markdown as a readable fallback surface", () => {
    const surface = parseMarkdownSurface("## Not Acceptable", {
      allowBareMarkdown: true
    });

    expect(surface).toMatchObject({
      markdown: "## Not Acceptable",
      actions: {
        app_id: "mdan",
        actions: {}
      }
    });
  });

  it("returns fresh fallback action manifests for bare markdown surfaces", () => {
    const first = parseMarkdownSurface("## First", {
      allowBareMarkdown: true
    });
    const second = parseMarkdownSurface("## Second", {
      allowBareMarkdown: true
    });

    expect(first?.actions.version).toBe("mdan.page.v1");
    expect(second?.actions.version).toBe("mdan.page.v1");

    if (!first || !second) {
      return;
    }

    first.actions.app_id = "mutated";
    expect(second.actions.app_id).toBe("mdan");
  });
});
