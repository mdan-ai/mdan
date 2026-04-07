import type { MdanComposedPage, MdanFragment, MdanPage } from "../types.js";

import { parsePage } from "./parser.js";
import { validatePage } from "./validate.js";

export interface ComposePageOptions {
  blocks?: Record<string, string>;
  visibleBlocks?: string[];
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
