import type { MdanBlock, MdanFragment, MdanFrontmatter, MdanInput, MdanOperation, MdanPage } from "../types.js";

const blockAnchorPattern = /^<!--\s*mdan:block\s+([a-zA-Z_][\w-]*)\s*-->$/;

function serializeFrontmatter(frontmatter: MdanFrontmatter): string {
  const entries = Object.entries(frontmatter);
  if (entries.length === 0) {
    return "";
  }
  const lines = entries.map(([key, value]) => `${key}: ${serializeScalar(value)}`);
  return `---\n${lines.join("\n")}\n---\n\n`;
}

function serializeScalar(value: string | number | boolean | null): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  return String(value);
}

function serializeOptions(input: MdanInput): string {
  if (!input.options || input.options.length === 0) {
    return "";
  }
  return ` [${input.options.map((option) => JSON.stringify(option)).join(", ")}]`;
}

function serializeInput(input: MdanInput): string {
  const parts = [`INPUT ${input.name}:${input.type}`];
  if (input.required) {
    parts.push("required");
  }
  if (input.secret) {
    parts.push("secret");
  }
  const options = serializeOptions(input);
  return `  ${parts.join(" ")}${options}`;
}

function serializeOperation(operation: MdanOperation): string {
  const parts = [`${operation.method} ${operation.name ?? operation.target} ${JSON.stringify(operation.target)}`];
  if (operation.inputs.length > 0) {
    parts.push(`WITH ${operation.inputs.join(", ")}`);
  }
  if (operation.label) {
    parts.push(`LABEL ${JSON.stringify(operation.label)}`);
  }
  if (operation.auto) {
    parts.push("AUTO");
  }
  if (operation.accept) {
    parts.push(`ACCEPT ${JSON.stringify(operation.accept)}`);
  }
  return `  ${parts.join(" ")}`;
}

export function serializeBlockV2(block: MdanBlock): string {
  const lines = [
    `BLOCK ${block.name} {`,
    ...block.inputs.map(serializeInput),
    ...block.operations.map(serializeOperation),
    "}"
  ];
  return lines.join("\n");
}

function serializeBlocksV2(blocks: MdanBlock[]): string {
  if (blocks.length === 0) {
    return "";
  }
  return `\`\`\`mdan\n${blocks.map(serializeBlockV2).join("\n\n")}\n\`\`\`\n`;
}

function getVisibleBlockNames(page: MdanPage): Set<string> | null {
  if (!page.visibleBlockNames || page.visibleBlockNames.length === 0) {
    return null;
  }
  return new Set(page.visibleBlockNames);
}

function getVisibleBlocks(page: MdanPage): MdanBlock[] {
  const visibleBlockNames = getVisibleBlockNames(page);
  if (!visibleBlockNames) {
    return page.blocks;
  }
  return page.blocks.filter((block) => visibleBlockNames.has(block.name));
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
  for (const line of markdown.split("\n")) {
    const anchorMatch = line.trim().match(blockAnchorPattern);
    if (anchorMatch) {
      const content = blockContent[anchorMatch[1] ?? ""]?.trim();
      if (content) {
        lines.push(content, "");
      }
    }
    lines.push(line);
  }
  return lines.join("\n");
}

export function serializePageV2(page: MdanPage): string {
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
  const blocks = serializeBlocksV2(getVisibleBlocks(page));
  return `${frontmatter}${markdown}${blocks ? `\n\n${blocks}` : "\n"}`;
}

export function serializeFragmentV2(fragment: MdanFragment): string {
  const markdown = fragment.markdown.trim();
  const blocks = serializeBlocksV2(fragment.blocks);
  return `${markdown}${blocks ? `\n\n${blocks}` : "\n"}`;
}
