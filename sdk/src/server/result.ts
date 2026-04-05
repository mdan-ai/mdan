import type { MdanComposedPage } from "../core/index.js";

import type { MdanActionResult, MdanStreamChunk, MdanStreamResult } from "./types.js";

export function ok(result: MdanActionResult): MdanActionResult {
  return {
    status: 200,
    ...result
  };
}

export function fail(result: MdanActionResult): MdanActionResult {
  return {
    status: 400,
    ...result
  };
}

export function block(
  page: MdanComposedPage,
  blockName: string,
  result: Omit<MdanActionResult, "fragment"> = {}
): MdanActionResult {
  return ok({
    ...result,
    fragment: page.fragment(blockName)
  });
}

export function stream(
  source: AsyncIterable<MdanStreamChunk> | Iterable<MdanStreamChunk>,
  result: Omit<MdanStreamResult, "stream"> = {}
): MdanStreamResult {
  return {
    status: 200,
    ...result,
    stream: source
  };
}
