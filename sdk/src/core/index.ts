import { MdanParseError } from "./errors.js";
import { parseAnchors } from "./parse/anchors.js";
import { parseBlocks } from "./parse/block-parser.js";
import { extractExecutableBlock } from "./parse/executable-block.js";
import { parseFrontmatter } from "./parse/frontmatter.js";
import { validatePage } from "./validate.js";
import type { MdanComposedPage, MdanFragment, MdanPage } from "./types.js";

export * from "./errors.js";
export * from "./markdown-renderer.js";
export * from "./markdown-body.js";
export * from "./negotiate.js";
export * from "./serialize.js";
export * from "./types.js";
export * from "./validate.js";

export interface ComposePageOptions {
  blocks?: Record<string, string>;
  visibleBlocks?: string[];
}

export function parsePage(source: string): MdanPage {
  const { frontmatter, body } = parseFrontmatter(source);
  const { markdown, executableContent } = extractExecutableBlock(body);
  try {
    return {
      frontmatter,
      markdown,
      blocks: parseBlocks(executableContent),
      blockAnchors: parseAnchors(markdown)
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new MdanParseError("Unknown parse failure.");
  }
}

export function parseAndValidatePage(source: string): MdanPage {
  return validatePage(parsePage(source));
}

function attachFragmentHelper(page: MdanPage): MdanComposedPage {
  const composed = page as MdanComposedPage;
  Object.defineProperty(composed, "fragment", {
    value(blockName: string): MdanFragment {
      return resolveFragmentForBlock(composed, blockName);
    },
    enumerable: false
  });
  return composed;
}

export function composePage(source: string, options: ComposePageOptions = {}): MdanComposedPage {
  const page = parseAndValidatePage(source);
  if (options.blocks) {
    page.blockContent = { ...options.blocks };
  }
  if (options.visibleBlocks) {
    page.visibleBlockNames = [...options.visibleBlocks];
  }
  return attachFragmentHelper(page);
}

function resolveFragmentForBlock(page: MdanPage, blockName: string): MdanFragment {
  const block = page.blocks.find((candidate) => candidate.name === blockName);
  if (!block) {
    throw new Error(`Unknown block "${blockName}".`);
  }
  const markdown = page.blockContent?.[blockName];
  if (!markdown?.trim()) {
    throw new Error(`Block "${blockName}" has no composed markdown content.`);
  }
  return {
    markdown,
    blocks: [block]
  };
}
