import type { MdanComposedPage, MdanFragment, MdanPage } from "../types.js";

import { markFragmentV2, markPageV2 } from "./metadata.js";
import { parsePageV2 } from "./parser.js";
import { validatePageV2 } from "./validate.js";

export interface ComposePageV2Options {
  blocks?: Record<string, string>;
  visibleBlocks?: string[];
}

export function parseAndValidatePageV2(source: string): MdanPage {
  return markPageV2(validatePageV2(parsePageV2(source)));
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

export function composePageV2(source: string, options: ComposePageV2Options = {}): MdanComposedPage {
  const page = parseAndValidatePageV2(source);
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
  return markFragmentV2({
    markdown,
    blocks: [block]
  });
}
