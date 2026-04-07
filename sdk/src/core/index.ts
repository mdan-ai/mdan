import { MdanParseError } from "./errors.js";
import { parseAnchors } from "./parse/anchors.js";
import { parseBlocks } from "./parse/block-parser.js";
import { extractExecutableBlock } from "./parse/executable-block.js";
import { parseFrontmatter } from "./parse/frontmatter.js";
import { serializeFragment as serializeFragmentLegacyImpl, serializePage as serializePageLegacyImpl } from "./serialize.js";
import {
  composePageV2,
  markFragmentLegacy,
  markPageLegacy,
  parseAndValidatePageV2,
  parsePageV2,
  serializeFragmentV2,
  serializePageV2,
  validatePageV2
} from "./syntax-v2/index.js";
import { validatePage as validatePageLegacyImpl } from "./validate.js";
import type { MdanComposedPage, MdanFragment, MdanPage } from "./types.js";

export * from "./errors.js";
export * from "./markdown-renderer.js";
export * from "./markdown-body.js";
export * from "./negotiate.js";
export * from "./syntax-v2/index.js";
export * from "./types.js";

export interface ComposePageOptions {
  blocks?: Record<string, string>;
  visibleBlocks?: string[];
}

export function parsePageLegacy(source: string): MdanPage {
  const { frontmatter, body } = parseFrontmatter(source);
  const { markdown, executableContent } = extractExecutableBlock(body);
  try {
    return markPageLegacy({
      frontmatter,
      markdown,
      blocks: parseBlocks(executableContent),
      blockAnchors: parseAnchors(markdown)
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new MdanParseError("Unknown parse failure.");
  }
}

export function parseAndValidatePageLegacy(source: string): MdanPage {
  return validatePageLegacyImpl(parsePageLegacy(source));
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

export function composePageLegacy(source: string, options: ComposePageOptions = {}): MdanComposedPage {
  const page = parseAndValidatePageLegacy(source);
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
    ...markFragmentLegacy({
      markdown,
      blocks: [block]
    })
  };
}

export const parsePage = parsePageV2;
export const parseAndValidatePage = parseAndValidatePageV2;
export const composePage = composePageV2;
export const validatePage = validatePageV2;
export const serializePage = serializePageV2;
export const serializeFragment = serializeFragmentV2;

export const validatePageLegacy = validatePageLegacyImpl;
export const serializePageLegacy = serializePageLegacyImpl;
export const serializeFragmentLegacy = serializeFragmentLegacyImpl;
