import type { MdanHeadlessBlock, MdanOperation } from "../core/types.js";

export interface HeadlessRuntimeState {
  status: "idle" | "loading" | "error";
  error?: string;
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

export interface MdanHeadlessHost {
  mount(): void;
  unmount(): void;
  subscribe(listener: HeadlessListener): () => void;
  getSnapshot(): HeadlessSnapshot;
  submit(operation: MdanOperation, values?: Record<string, string>): Promise<void>;
  visit(target: string): Promise<void>;
}
