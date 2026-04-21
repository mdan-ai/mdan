export type ActionMethod = "GET" | "POST";
export type ActionVerb = "read" | "write";

export interface NormalizedActionInputField {
  kind: "text" | "number" | "boolean";
  required: boolean;
  label?: string;
  description?: string;
}

export type NormalizedActionInputShape = Record<string, NormalizedActionInputField>;

export interface NormalizedResult {
  pageId?: string;
  pagePath?: string;
  status?: number;
  headers?: Record<string, string>;
  patchState?: Record<string, unknown>;
  error?: {
    message: string;
    code?: string;
  };
}

export interface NormalizedActionContext<TState = unknown, TInput = Record<string, unknown>> {
  input: TInput;
  state: TState;
  request: {
    method: ActionMethod;
    path: string;
    headers: Record<string, string | undefined>;
  };
}

export interface NormalizedAction {
  id: string;
  pageId: string;
  pagePath: string;
  method: ActionMethod;
  path: string;
  label: string;
  verb: ActionVerb;
  input: NormalizedActionInputShape;
  run: (context: NormalizedActionContext) => Promise<NormalizedResult> | NormalizedResult;
}

export interface NormalizedBlockContext<TState = unknown> {
  state: TState;
}

export interface NormalizedBlock {
  name: string;
  render: (context: NormalizedBlockContext) => Promise<string> | string;
}

export interface NormalizedPageLoaderContext<TState = unknown> {
  state: TState;
}

export interface NormalizedPage {
  id: string;
  path: string;
  markdownPath: string;
  markdownSource: string;
  blocks: NormalizedBlock[];
  actions: NormalizedAction[];
  load?: (context: NormalizedPageLoaderContext) => Promise<unknown> | unknown;
}

export interface AppDefinition<TState = unknown> {
  id: string;
  initialState: TState;
  pagesById: Map<string, NormalizedPage>;
  pagesByPath: Map<string, NormalizedPage>;
  actionsById: Map<string, NormalizedAction>;
  actionsByRouteKey: Map<string, NormalizedAction>;
}
