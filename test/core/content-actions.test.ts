import { describe, expect, it } from "vitest";

import {
  extractRegionTrust,
  extractSections,
  parseFrontmatter,
  validateContentPair
} from "../../src/content/content-actions.js";

describe("content-actions", () => {
  it("parses simple frontmatter values", () => {
    const parsed = parseFrontmatter(`---
app_id: "demo"
state_version: 3
enabled: true
---

# Demo`);

    expect(parsed).toEqual({
      app_id: "demo",
      state_version: 3,
      enabled: true
    });
  });

  it("extracts html comment block anchors", () => {
    const content = `# Demo

Summary

<!-- mdan:block id="summary" -->

Preview

<!-- mdan:block id="preview" -->`;

    expect(extractSections(content)).toEqual([
      {
        id: "summary",
        actions: [],
        trust: "unknown",
        body: ""
      },
      {
        id: "preview",
        actions: [],
        trust: "unknown",
        body: ""
      }
    ]);

    expect(extractRegionTrust(content)).toEqual({
      summary: "unknown",
      preview: "unknown"
    });
  });

  it("validates block action references", () => {
    const content = `## Purpose
Do action:openDetails.

## Context
Body

## Rules
Use action_id="saveDraft".

## Result
Done.

<!-- agent:begin id="coordinator" -->
Run action:refreshPreview.
<!-- agent:end -->

Summary

<!-- mdan:block id="summary" -->`;

    const violations = validateContentPair(content, ["openDetails", "saveDraft"]);
    expect(violations).toEqual([]);
  });

  it("rejects duplicate block ids in content", () => {
    const content = `# Demo

First

<!-- mdan:block id="summary" -->

Second

<!-- mdan:block id="summary" -->`;

    const violations = validateContentPair(content, ["openDetails", "refreshPreview"]);
    expect(violations).toContainEqual({
      path: "content.block[summary].id",
      message: 'duplicate block id: "summary"'
    });
  });

});
