import type { MdanFragment, MdanPage } from "../../core/protocol.js";
import type { ReadableSurface } from "../../core/surface/markdown.js";
import type { MdanSessionMutation } from "./session.js";

export interface MdanActionResult {
  fragment?: MdanFragment;
  page?: MdanPage;
  route?: string;
  status?: number;
  headers?: Record<string, string>;
  session?: MdanSessionMutation;
}

export interface MdanPageResult {
  page: MdanPage;
  route?: string;
  status?: number;
  headers?: Record<string, string>;
  session?: MdanSessionMutation;
}

export type MdanStreamChunk = string | MdanFragment;

export interface MdanStreamResult {
  stream: AsyncIterable<MdanStreamChunk> | Iterable<MdanStreamChunk>;
  route?: string;
  status?: number;
  headers?: Record<string, string>;
  session?: MdanSessionMutation;
}

export type MdanHandlerResult = MdanActionResult | MdanStreamResult;

export type MdanHandlerResultLike = MdanStreamResult | ReadableSurface | MdanActionResult;
