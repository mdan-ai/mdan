import type { MdanPage } from "../../core/protocol.js";
import type { ReadableSurface } from "../../core/surface/markdown.js";
import type { MdanInputMap } from "./index.js";
import type { MdanSessionSnapshot } from "./session.js";
import type { MdanRequest, MdanResponse } from "./transport.js";
import type {
  MdanActionResult,
  MdanHandlerResultLike,
  MdanPageResult,
  MdanStreamResult
} from "./result.js";

export interface MdanHandlerContext {
  request: MdanRequest;
  inputs: MdanInputMap;
  inputsRaw: Record<string, unknown>;
  session: MdanSessionSnapshot | null;
  params: Record<string, string>;
  readAsset(assetId: string): Promise<Buffer>;
  openAssetStream(assetId: string): AsyncIterable<Uint8Array> & NodeJS.ReadableStream;
}

export type MdanHandler = (
  context: MdanHandlerContext
) => Promise<MdanHandlerResultLike> | MdanHandlerResultLike;

export interface MdanPageHandlerContext {
  request: MdanRequest;
  session: MdanSessionSnapshot | null;
  params: Record<string, string>;
}

export type MdanPageHandlerResult = ReadableSurface | MdanPage | MdanPageResult | null;

export type MdanPageHandler = (
  context: MdanPageHandlerContext
) => Promise<MdanPageHandlerResult> | MdanPageHandlerResult;

export interface MdanBrowserBootstrapContext {
  request: MdanRequest;
  session: MdanSessionSnapshot | null;
}

export type MdanBrowserBootstrapResult =
  | ReadableSurface
  | MdanPage
  | MdanPageResult
  | MdanActionResult
  | null;

export type MdanBrowserBootstrapHandler = (
  context: MdanBrowserBootstrapContext
) => Promise<MdanBrowserBootstrapResult> | MdanBrowserBootstrapResult;

export type { MdanActionResult, MdanPageResult, MdanStreamResult, MdanResponse };
