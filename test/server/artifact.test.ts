import { describe, expect, it } from "vitest";

import { parseMarkdownArtifactSurface } from "../../src/content/artifact-surface.js";
import { createArtifactFragment, createArtifactPage, createExecutableContent } from "../../src/server/index.js";

describe("artifact helpers", () => {
  it("serializes executable JSON with stable indentation", () => {
    expect(
      createExecutableContent({
        app_id: "demo"
      })
    ).toBe('{\n  "app_id": "demo"\n}');
  });

  it("builds a page and infers block anchors from markdown, blockContent, and blocks", () => {
    const page = createArtifactPage({
      markdown: "# Demo\n\n<!-- mdan:block main -->",
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
    expect(page.blockAnchors).toEqual(["main", "secondary"]);
    expect(page.visibleBlockNames).toEqual(["main", "secondary"]);
  });

  it("builds a fragment with executable JSON", () => {
    const fragment = createArtifactFragment({
      markdown: "## Saved",
      executableJson: { actions: [{ id: "refresh" }] }
    });

    expect(fragment.markdown).toBe("## Saved");
    expect(fragment.executableContent).toContain('"id": "refresh"');
    expect(fragment.blocks).toEqual([]);
  });

  it("parses the last executable mdan block while preserving earlier example fences", () => {
    const artifact = `# Docs

\`\`\`mdan
not valid json
\`\`\`

## Example

\`\`\`mdan
{
  "app_id": "demo",
  "actions": []
}
\`\`\`
`;

    const surface = parseMarkdownArtifactSurface(artifact);

    expect(surface).toMatchObject({
      actions: {
        app_id: "demo",
        actions: []
      }
    });
    expect(surface?.markdown).toContain("not valid json");
    expect(surface?.markdown).not.toContain('"app_id": "demo"');
  });

  it("can treat plain markdown as a readable fallback surface", () => {
    const surface = parseMarkdownArtifactSurface("## Not Acceptable", {
      allowBareMarkdown: true
    });

    expect(surface).toMatchObject({
      markdown: "## Not Acceptable",
      actions: {
        app_id: "mdan",
        actions: []
      }
    });
  });
});
