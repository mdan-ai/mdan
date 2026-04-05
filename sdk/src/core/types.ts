export type MdanInputType = "text" | "number" | "boolean" | "choice" | "asset";

export type MdanFrontmatter = Record<string, string | number | boolean | null>;

export interface MdanInput {
  name: string;
  type: MdanInputType;
  required: boolean;
  secret: boolean;
  options?: string[];
}

export interface MdanGetOperation {
  method: "GET";
  target: string;
  name?: string;
  inputs: string[];
  auto?: boolean;
  label?: string;
  accept?: string;
}

export interface MdanPostOperation {
  method: "POST";
  target: string;
  name: string;
  inputs: string[];
  auto?: boolean;
  label?: string;
  accept?: string;
}

export type MdanOperation = MdanGetOperation | MdanPostOperation;

export interface MdanBlock {
  name: string;
  inputs: MdanInput[];
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
  inputs: MdanInput[];
  operations: MdanOperation[];
}

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

export type MdanRepresentation = "markdown" | "html" | "event-stream" | "not-acceptable";
