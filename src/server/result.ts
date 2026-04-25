import type { MdanActionResult, MdanStreamChunk, MdanStreamResult } from "./types/result.js";

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
