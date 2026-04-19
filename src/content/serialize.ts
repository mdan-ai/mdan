import type { MdanFragment, MdanFrontmatter, MdanPage } from "../protocol/types.js";

const blockAnchorPattern = /^<!--\s*mdan:block\s+([a-zA-Z_][\w-]*)\s*-->$/;

function serializeScalar(value: string | number | boolean | null): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  return String(value);
}

function serializeFrontmatter(frontmatter: MdanFrontmatter): string {
  const entries = Object.entries(frontmatter);
  if (entries.length === 0) {
    return "";
  }
  const lines = entries.map(([key, value]) => `${key}: ${serializeScalar(value)}`);
  return `---\n${lines.join("\n")}\n---\n\n`;
}

function getVisibleBlockNames(page: MdanPage): Set<string> | null {
  if (!page.visibleBlockNames || page.visibleBlockNames.length === 0) {
    return null;
  }
  return new Set(page.visibleBlockNames);
}

function getVisibleBlockContent(page: MdanPage): Record<string, string> | undefined {
  if (!page.blockContent) {
    return undefined;
  }
  const visibleBlockNames = getVisibleBlockNames(page);
  if (!visibleBlockNames) {
    return page.blockContent;
  }
  return Object.fromEntries(Object.entries(page.blockContent).filter(([name]) => visibleBlockNames.has(name)));
}

function injectBlockContent(markdown: string, blockContent: Record<string, string> | undefined): string {
  if (!blockContent || Object.keys(blockContent).length === 0) {
    return markdown;
  }

  const lines: string[] = [];
  let anchorCount = 0;
  for (const line of markdown.split("\n")) {
    const anchorMatch = line.trim().match(blockAnchorPattern);
    if (anchorMatch) {
      anchorCount += 1;
      const content = blockContent[anchorMatch[1] ?? ""]?.trim();
      if (content) {
        lines.push(content, "");
      }
    }
    lines.push(line);
  }

  if (anchorCount > 0) {
    return lines.join("\n");
  }

  const appended = [markdown.trim()];
  for (const value of Object.values(blockContent)) {
    const trimmed = value.trim();
    if (trimmed) {
      appended.push(trimmed);
    }
  }
  return appended.filter(Boolean).join("\n\n");
}

export function serializePage(page: MdanPage): string {
  const frontmatter = serializeFrontmatter(page.frontmatter);
  const visibleBlockNames = getVisibleBlockNames(page);
  const markdown = injectBlockContent(
    page.markdown
      .trim()
      .split("\n")
      .filter((line) => {
        const anchorMatch = line.trim().match(blockAnchorPattern);
        if (!anchorMatch || !visibleBlockNames) {
          return true;
        }
        return visibleBlockNames.has(anchorMatch[1] ?? "");
      })
      .join("\n"),
    getVisibleBlockContent(page)
  );
  return `${frontmatter}${markdown}\n`;
}

export function serializeFragment(fragment: MdanFragment): string {
  const markdown = fragment.markdown.trim();
  if (!markdown) {
    return "";
  }
  return `${markdown}\n`;
}
