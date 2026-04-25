import type { MdanRequest, MdanResponse } from "./transport.js";

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
