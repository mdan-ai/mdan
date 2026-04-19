import type {
  MdanBlock,
  MdanConfirmationPolicy,
  MdanHeadlessBlock,
  MdanHeadlessBootstrap,
  MdanOperation,
  MdanPage
} from "../protocol/types.js";
import { type JsonAction, type JsonSurfaceEnvelope, isJsonSurfaceEnvelope } from "../protocol/surface.js";
import { stripAgentBlocks } from "../content/agent-blocks.js";
import { blockInputsFromActions, toOperation } from "./surface-actions.js";

export { isJsonSurfaceEnvelope };
export type { JsonAction, JsonSurfaceEnvelope } from "../protocol/surface.js";

export type HeadlessSnapshotLike = {
  status: "idle" | "loading" | "error";
  route?: string;
  markdown: string;
  blocks: MdanHeadlessBlock[];
};

function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

function stripContentBlocks(markdown: string): string {
  return markdown
    .replace(/:::\s*block\{[^}]*\}[\s\S]*?:::/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toConfirmationPolicy(value: unknown): MdanConfirmationPolicy | null {
  if (typeof value !== "string") {
    return null;
  }
  return ["never", "always", "high-and-above"].includes(value) ? (value as MdanConfirmationPolicy) : null;
}

function parseContentBlocks(content: string): Map<string, string[]> {
  const byBlock = new Map<string, string[]>();
  const expression = /:::\s*block\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = expression.exec(content)) !== null) {
    const attrs = match[1] ?? "";
    const id = attrs.match(/\bid="([^"]+)"/)?.[1];
    if (!id) {
      continue;
    }
    const actions = (attrs.match(/\bactions="([^"]+)"/)?.[1] ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    byBlock.set(id, actions);
  }
  return byBlock;
}

function resolveBlockNames(input: JsonSurfaceEnvelope, blockActionRefs: Map<string, string[]>): string[] {
  const names: string[] = [];
  for (const name of input.actions.blocks ?? []) {
    if (typeof name === "string" && !names.includes(name)) {
      names.push(name);
    }
  }
  for (const name of Object.keys(input.view?.regions ?? {})) {
    if (!names.includes(name)) {
      names.push(name);
    }
  }
  for (const name of blockActionRefs.keys()) {
    if (!names.includes(name)) {
      names.push(name);
    }
  }
  return names;
}

export function adaptJsonEnvelopeToHeadlessSnapshot(input: JsonSurfaceEnvelope): HeadlessSnapshotLike {
  const rawContent = stripFrontmatter(String(input.content ?? ""));
  const content = stripAgentBlocks(stripContentBlocks(rawContent));
  const blockActionRefs = parseContentBlocks(rawContent);
  const actionList = Array.isArray(input.actions.actions) ? input.actions.actions : [];
  const allowedNextActions = Array.isArray(input.actions.allowed_next_actions)
    ? input.actions.allowed_next_actions.filter((entry): entry is string => typeof entry === "string")
    : null;
  const allowed = allowedNextActions ? new Set(allowedNextActions) : null;
  const defaultConfirmationPolicy =
    toConfirmationPolicy(input.actions.security?.default_confirmation_policy) ?? "never";
  const actionById = new Map<string, JsonAction>();
  for (const action of actionList) {
    if (typeof action?.id === "string") {
      actionById.set(action.id, action);
    }
  }

  const blocks: MdanHeadlessBlock[] = [];
  for (const blockName of resolveBlockNames(input, blockActionRefs)) {
    const referencedActions = blockActionRefs.get(blockName) ?? [];
    const actionsForBlock = referencedActions
      .filter((id) => allowed === null || allowed.has(id))
      .map((id) => actionById.get(id))
      .filter((value): value is JsonAction => Boolean(value));

    const operations = actionsForBlock
      .map((action) => toOperation(action, defaultConfirmationPolicy))
      .filter((value): value is MdanOperation => Boolean(value));

    blocks.push({
      name: blockName,
      markdown: stripAgentBlocks(input.view?.regions?.[blockName] ?? ""),
      inputs: blockInputsFromActions(actionsForBlock),
      operations
    });
  }

  return {
    status: "idle",
    ...(input.view?.route_path ? { route: input.view.route_path } : {}),
    markdown: content,
    blocks
  };
}

export function adaptJsonEnvelopeToHeadlessBootstrap(input: JsonSurfaceEnvelope): MdanHeadlessBootstrap {
  const snapshot = adaptJsonEnvelopeToHeadlessSnapshot(input);
  return {
    kind: "page",
    ...(snapshot.route ? { route: snapshot.route } : {}),
    markdown: snapshot.markdown,
    blocks: snapshot.blocks
  };
}

function toMdanBlock(block: MdanHeadlessBlock): MdanBlock {
  return {
    name: block.name,
    inputs: block.inputs,
    operations: block.operations
  };
}

export function adaptJsonEnvelopeToMdanPage(input: JsonSurfaceEnvelope): MdanPage {
  const snapshot = adaptJsonEnvelopeToHeadlessSnapshot(input);
  const blockNames = snapshot.blocks.map((block) => block.name);
  const blockContent = Object.fromEntries(snapshot.blocks.map((block) => [block.name, block.markdown]));
  const anchorMarkdown = blockNames.map((name) => `<!-- mdan:block ${name} -->`).join("\n\n");
  const markdown = [snapshot.markdown.trim(), anchorMarkdown].filter(Boolean).join("\n\n");
  return {
    frontmatter: {},
    markdown,
    blockContent,
    blocks: snapshot.blocks.map(toMdanBlock),
    blockAnchors: [...blockNames],
    visibleBlockNames: [...blockNames]
  };
}
