import type { FieldSchema } from "./input/types.js";

export type MdanOperationResponseMode = "page" | "region";
export type MdanConfirmationPolicy = "never" | "always" | "high-and-above";

export type MdanFrontmatter = Record<string, string | number | boolean | null>;

export interface MdanGetOperation {
  method: "GET";
  target: string;
  name?: string;
  inputs: string[];
  auto?: boolean;
  label?: string;
  accept?: string;
  verb?: string;
  stateEffect?: MdanOperationStateEffect;
  guard?: MdanOperationGuard;
  security?: MdanOperationSecurity;
  inputSchema?: Record<string, unknown>;
  actionId?: string;
  actionProof?: string;
  actionIssuedAt?: number;
  submitFormat?: string;
  requiresConfirmation?: boolean;
  submitExample?: Record<string, unknown>;
}

export interface MdanPostOperation {
  method: "POST";
  target: string;
  name: string;
  inputs: string[];
  auto?: boolean;
  label?: string;
  accept?: string;
  verb?: string;
  stateEffect?: MdanOperationStateEffect;
  guard?: MdanOperationGuard;
  security?: MdanOperationSecurity;
  inputSchema?: Record<string, unknown>;
  actionId?: string;
  actionProof?: string;
  actionIssuedAt?: number;
  submitFormat?: string;
  requiresConfirmation?: boolean;
  submitExample?: Record<string, unknown>;
}

export type MdanOperation = MdanGetOperation | MdanPostOperation;

export interface MdanOperationStateEffect {
  responseMode?: MdanOperationResponseMode;
  updatedRegions?: string[];
}

export interface MdanOperationGuard {
  riskLevel?: string;
}

export interface MdanOperationSecurity {
  confirmationPolicy?: MdanConfirmationPolicy;
}

export interface MdanBlock {
  name: string;
  inputs: FieldSchema[];
  operations: MdanOperation[];
}

export interface MdanPage {
  frontmatter: MdanFrontmatter;
  markdown: string;
  blockContent?: Record<string, string>;
  blocks: MdanBlock[];
  blockAnchors: string[];
  visibleBlockNames?: string[];
}

export interface MdanComposedPage extends MdanPage {
  fragment(blockName: string): MdanFragment;
}

export interface MdanFragment {
  markdown: string;
  blocks: MdanBlock[];
}

export interface MdanHeadlessBlock {
  name: string;
  markdown: string;
  inputs: FieldSchema[];
  operations: MdanOperation[];
}

export type MdanSubmitValue =
  | string
  | number
  | boolean
  | null
  | File
  | { [key: string]: MdanSubmitValue }
  | MdanSubmitValue[];
export type MdanSubmitValues = Record<string, MdanSubmitValue>;

export interface MdanHeadlessPageBootstrap {
  kind: "page";
  route?: string;
  markdown: string;
  blocks: MdanHeadlessBlock[];
}

export interface MdanHeadlessFragmentBootstrap {
  kind: "fragment";
  block: MdanHeadlessBlock;
}

export type MdanHeadlessBootstrap = MdanHeadlessPageBootstrap | MdanHeadlessFragmentBootstrap;

export type MdanRepresentation = "json" | "markdown" | "html" | "event-stream" | "not-acceptable";
