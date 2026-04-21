import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { docsPages, listDocsRoutes } from "../../docs-site/src/content.js";
import { extractDescription, extractTitle, parseMarkdownDocument } from "../../docs-site/src/markdown.js";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

describe("docs-site content manifest", () => {
  it("does not contain duplicate routes", () => {
    const routes = listDocsRoutes();
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("points every route at an existing source file", async () => {
    await Promise.all(
      docsPages.map((page) => access(join(repoRoot, page.sourcePath), constants.R_OK))
    );
  });
});

describe("docs-site markdown metadata", () => {
  it("extracts frontmatter title and description when present", () => {
    const document = parseMarkdownDocument(`---
title: Example Title
description: Example Description
---
# Heading

Body text.
`);

    expect(extractTitle(document, "/example")).toBe("Example Title");
    expect(extractDescription(document)).toBe("Example Description");
  });

  it("falls back to heading and body content without frontmatter", () => {
    const document = parseMarkdownDocument(`# Example Heading

First paragraph.

## Next
`);

    expect(extractTitle(document, "/example")).toBe("Example Heading");
    expect(extractDescription(document)).toBe("First paragraph.");
  });
});
