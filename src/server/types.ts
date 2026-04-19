import type { MdanFragment, MdanPage } from "../protocol/types.js";
import type { JsonSurfaceEnvelope } from "../protocol/surface.js";
import type { MdanAssetHandle } from "./asset-types.js";

export interface MdanRequest {
  method: "GET" | "POST";
  url: string;
  headers: Record<string, string | undefined>;
  query?: Record<string, string>;
  body?: string;
  cookies: Record<string, string>;
}

export interface MdanResponse {
  status: number;
  headers: Record<string, string>;
  body: string | AsyncIterable<string>;
}

export type MdanInputScalar = string | number | boolean | null;
export type MdanInputValue =
  | MdanInputScalar
  | MdanAssetHandle
  | { [key: string]: MdanInputValue }
  | MdanInputValue[];
export type MdanInputMap = Record<string, MdanInputValue>;

export interface MdanSessionSnapshot {
  [key: string]: unknown;
}

export type MdanSessionMutation =
  | { type: "sign-in"; session: MdanSessionSnapshot }
  | { type: "refresh"; session: MdanSessionSnapshot }
  | { type: "sign-out" };

export interface MdanSessionProvider {
  read(request: MdanRequest): Promise<MdanSessionSnapshot | null>;
  commit(mutation: MdanSessionMutation | null, response: MdanResponse): Promise<void>;
  clear(session: MdanSessionSnapshot | null, response: MdanResponse, request: MdanRequest): Promise<void>;
}

export interface MdanProtocolDiscovery {
  markdownHref: string;
  llmsTxtHref?: string;
}

export interface MdanHtmlDiscoveryLinks extends Partial<MdanProtocolDiscovery> {}

export interface MdanHtmlDiscoveryContext {
  request: MdanRequest;
  kind: "page" | "fragment";
  route?: string;
}

export type MdanHtmlDiscoveryResolver =
  | MdanHtmlDiscoveryLinks
  | ((context: MdanHtmlDiscoveryContext) => MdanHtmlDiscoveryLinks | null | undefined);

export interface MdanActionResult {
  fragment?: MdanFragment;
  page?: MdanPage;
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

export interface MdanHandlerContext {
  request: MdanRequest;
  inputs: MdanInputMap;
  inputsRaw: Record<string, unknown>;
  session: MdanSessionSnapshot | null;
  params: Record<string, string>;
  readAsset(assetId: string): Promise<Buffer>;
  openAssetStream(assetId: string): AsyncIterable<Uint8Array> & NodeJS.ReadableStream;
}

export type MdanHandlerResult = MdanActionResult | MdanStreamResult;

export type MdanHandlerResultLike = MdanStreamResult | JsonSurfaceEnvelope;

export type MdanHandler = (
  context: MdanHandlerContext
) => Promise<MdanHandlerResultLike> | MdanHandlerResultLike;

export interface MdanPageHandlerContext {
  request: MdanRequest;
  session: MdanSessionSnapshot | null;
  params: Record<string, string>;
}

export type MdanPageHandlerResult = JsonSurfaceEnvelope | null;

export type MdanPageHandler = (
  context: MdanPageHandlerContext
) => Promise<MdanPageHandlerResult> | MdanPageHandlerResult;
