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

  it("extracts single-line section anchors and trust values", () => {
    const content = `# Demo

Summary

::: block{id="summary" actions="openDetails" trust="trusted"}

Preview

::: block{id="preview" actions="refreshPreview" trust="untrusted"}`;

    expect(extractSections(content)).toEqual([
      {
        id: "summary",
        actions: ["openDetails"],
        trust: "trusted",
        body: ""
      },
      {
        id: "preview",
        actions: ["refreshPreview"],
        trust: "untrusted",
        body: ""
      }
    ]);

    expect(extractRegionTrust(content)).toEqual({
      summary: "trusted",
      preview: "untrusted"
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

::: block{id="summary" actions="openDetails,missingAction" trust="trusted"}`;

    const violations = validateContentPair(content, ["openDetails", "saveDraft"]);
    expect(violations).toEqual([
      {
        path: "content.block[summary].actions",
        message: 'block references unknown action id: "missingAction"'
      }
    ]);
  });

  it("rejects duplicate block ids in content", () => {
    const content = `# Demo

First

::: block{id="summary" actions="openDetails" trust="trusted"}

Second

::: block{id="summary" actions="refreshPreview" trust="trusted"}`;

    const violations = validateContentPair(content, ["openDetails", "refreshPreview"]);
    expect(violations).toContainEqual({
      path: "content.block[summary].id",
      message: 'duplicate block id: "summary"'
    });
  });

  it("rejects duplicate action references inside a block", () => {
    const content = `# Demo

Summary

::: block{id="summary" actions="openDetails,openDetails" trust="trusted"}`;

    const violations = validateContentPair(content, ["openDetails"]);
    expect(violations).toContainEqual({
      path: "content.block[summary].actions",
      message: 'duplicate action id reference: "openDetails"'
    });
  });
});
