import type { MdanFragment, MdanPage } from "../core/index.js";

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
  inputs: Record<string, string>;
  session: MdanSessionSnapshot | null;
}

export type MdanHandlerResult = MdanActionResult | MdanStreamResult;

export type MdanHandler = (context: MdanHandlerContext) => Promise<MdanHandlerResult> | MdanHandlerResult;

export interface MdanPageHandlerContext {
  request: MdanRequest;
  session: MdanSessionSnapshot | null;
}

export type MdanPageHandler = (context: MdanPageHandlerContext) => Promise<MdanPage | null> | MdanPage | null;
