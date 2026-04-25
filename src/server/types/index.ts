import type { MdanAssetHandle } from "../asset-types.js";
import type { MdanRequest } from "./transport.js";

export type { MdanRequest, MdanResponse } from "./transport.js";
export type {
  MdanSessionMutation,
  MdanSessionProvider,
  MdanSessionSnapshot
} from "./session.js";
export type {
  MdanActionResult,
  MdanHandlerResult,
  MdanHandlerResultLike,
  MdanPageResult,
  MdanStreamChunk,
  MdanStreamResult
} from "./result.js";
export type {
  MdanHandler,
  MdanBrowserBootstrapContext,
  MdanBrowserBootstrapHandler,
  MdanBrowserBootstrapResult,
  MdanHandlerContext,
  MdanPageHandler,
  MdanPageHandlerContext,
  MdanPageHandlerResult
} from "./handler.js";
import type { MdanSessionMutation } from "./session.js";

export type MdanInputScalar = string | number | boolean | null;
export type MdanInputValue =
  | MdanInputScalar
  | MdanAssetHandle
  | { [key: string]: MdanInputValue }
  | MdanInputValue[];
export type MdanInputMap = Record<string, MdanInputValue>;

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
