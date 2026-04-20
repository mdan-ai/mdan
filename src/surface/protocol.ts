import type { MdanHeadlessBlock, MdanOperation, MdanSubmitValues } from "./protocol-model.js";
export type { MdanSubmitValue, MdanSubmitValues } from "./protocol-model.js";

export interface HeadlessRuntimeState {
  status: "idle" | "loading" | "error";
  error?: string;
  transition?: "page" | "region" | "stream";
}

export interface HeadlessSnapshot extends HeadlessRuntimeState {
  route?: string;
  markdown: string;
  blocks: MdanHeadlessBlock[];
}

export type HeadlessListener = (snapshot: HeadlessSnapshot) => void;

export interface HeadlessDebugMessage {
  direction: "send" | "receive";
  method: string;
  url: string;
  markdown: string;
}

export interface MdanHeadlessUiHost {
  mount?(): void;
  unmount?(): void;
  subscribe(listener: HeadlessListener): () => void;
  submit(operation: MdanOperation, values?: MdanSubmitValues): Promise<void>;
  visit(target: string): Promise<void>;
  sync(target?: string): Promise<void>;
}

export interface MdanHeadlessHost extends MdanHeadlessUiHost {
  mount(): void;
  unmount(): void;
  getSnapshot(): HeadlessSnapshot;
}
