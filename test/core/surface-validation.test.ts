import { describe, expect, it } from "vitest";

import { MDAN_PAGE_MANIFEST_VERSION } from "../../src/core/protocol.js";
import { getReadableSurfaceViolation } from "../../src/core/surface/validation.js";

describe("readable surface validation", () => {
  it("does not treat markdown authoring headings as a runtime contract", () => {
    const violation = getReadableSurfaceViolation(
      {
        markdown: `# Demo

## Context
This page intentionally uses a project-specific writing shape.

## Context
Repeated headings are authoring policy, not SDK protocol.
`,
        actions: {
          version: MDAN_PAGE_MANIFEST_VERSION,
          app_id: "demo",
          state_id: "demo:home",
          state_version: 1,
          blocks: {},
          actions: {}
        }
      },
      {
        appId: "demo"
      }
    );

    expect(violation).toBeNull();
  });
});
