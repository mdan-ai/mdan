import type {
  MdanHeadlessBlock,
  MdanOperation,
  MdanSubmitValue,
  MdanSubmitValues
} from "../core/surface/presentation.js";

export type { MdanSubmitValue, MdanSubmitValues } from "../core/surface/presentation.js";

export interface FrontendRuntimeState {
  status: "idle" | "loading" | "error";
  error?: string;
  transition?: "page" | "region" | "stream";
}

export interface FrontendSnapshot extends FrontendRuntimeState {
  route?: string;
  markdown: string;
  blocks: MdanHeadlessBlock[];
}

export type FrontendListener = (snapshot: FrontendSnapshot) => void;

export interface FrontendUiHost {
  mount?(): void;
  unmount?(): void;
  subscribe(listener: FrontendListener): () => void;
  submit(operation: MdanOperation, values?: MdanSubmitValues): Promise<void>;
  visit(target: string): Promise<void>;
  sync(target?: string): Promise<void>;
}

export interface FrontendHost extends FrontendUiHost {
  mount(): void;
  unmount(): void;
  getSnapshot(): FrontendSnapshot;
}

export interface CreateFrontendHostOptions {
  initialRoute?: string;
  fetchImpl?: typeof fetch;
}

export type FrontendHostFactory = (options: CreateFrontendHostOptions) => FrontendHost;
