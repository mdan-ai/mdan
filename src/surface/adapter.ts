import type {
  MdanBlock,
  MdanConfirmationPolicy,
  MdanHeadlessBlock,
  MdanOperation,
  MdanPage,
  JsonAction
} from "./protocol-model.js";
import {
  stripReadableBlockMarkdown,
  stripReadablePageMarkdown,
  type ReadableSurface
} from "./content.js";
import { blockInputsFromActions, toOperation } from "./surface-actions.js";

export type { JsonAction } from "./protocol-model.js";

export type HeadlessSnapshotLike = {
  status: "idle" | "loading" | "error";
  route?: string;
  markdown: string;
  blocks: MdanHeadlessBlock[];
};

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

function resolveBlockNames(
  actions: ReadableSurface["actions"],
  regions: Record<string, string> | undefined,
  blockActionRefs: Map<string, string[]>
): string[] {
  const names: string[] = [];
  for (const name of actions.blocks ?? []) {
    if (typeof name === "string" && !names.includes(name)) {
      names.push(name);
    }
  }
  for (const name of Object.keys(regions ?? {})) {
    if (!names.includes(name)) {
      names.push(name);
    }
  }
  for (const name of blockActionRefs.keys()) {
    if (!names.includes(name)) {
      names.push(name);
    }
  }
  for (const action of actions.actions ?? []) {
    if (typeof action.block === "string" && !names.includes(action.block)) {
      names.push(action.block);
    }
  }
  return names;
}

function resolveActionsForBlock(
  blockName: string,
  actionList: JsonAction[],
  blockActionRefs: Map<string, string[]>,
  allowed: Set<string> | null
): JsonAction[] {
  const referencedActions = blockActionRefs.get(blockName);
  if (referencedActions) {
    const actionById = new Map<string, JsonAction>();
    for (const action of actionList) {
      if (typeof action?.id === "string") {
        actionById.set(action.id, action);
      }
    }
    return referencedActions
      .filter((id) => allowed === null || allowed.has(id))
      .map((id) => actionById.get(id))
      .filter((value): value is JsonAction => Boolean(value));
  }

  return actionList.filter((action) => {
    const id = typeof action.id === "string" ? action.id : null;
    return action.block === blockName && (allowed === null || (id !== null && allowed.has(id)));
  });
}

export function adaptReadableSurfaceToHeadlessSnapshot(input: ReadableSurface): HeadlessSnapshotLike {
  const rawContent = String(input.markdown ?? "");
  const content = stripReadablePageMarkdown(rawContent);
  const blockActionRefs = parseContentBlocks(rawContent);
  const actionList = Array.isArray(input.actions.actions) ? input.actions.actions : [];
  const allowedNextActions = Array.isArray(input.actions.allowed_next_actions)
    ? input.actions.allowed_next_actions.filter((entry): entry is string => typeof entry === "string")
    : null;
  const allowed = allowedNextActions ? new Set(allowedNextActions) : null;
  const defaultConfirmationPolicy =
    toConfirmationPolicy(input.actions.security?.default_confirmation_policy) ?? "never";

  const blocks: MdanHeadlessBlock[] = [];
  for (const blockName of resolveBlockNames(input.actions, input.regions, blockActionRefs)) {
    const actionsForBlock = resolveActionsForBlock(blockName, actionList, blockActionRefs, allowed);

    const operations = actionsForBlock
      .map((action) => toOperation(action, defaultConfirmationPolicy))
      .filter((value): value is MdanOperation => Boolean(value));

    blocks.push({
      name: blockName,
      markdown: stripReadableBlockMarkdown(input.regions?.[blockName] ?? ""),
      inputs: blockInputsFromActions(actionsForBlock),
      operations
    });
  }

  return {
    status: "idle",
    ...(input.route ? { route: input.route } : {}),
    markdown: content,
    blocks
  };
}

function toMdanBlock(block: MdanHeadlessBlock): MdanBlock {
  return {
    name: block.name,
    inputs: block.inputs,
    operations: block.operations
  };
}

export function adaptReadableSurfaceToMdanPage(input: ReadableSurface): MdanPage {
  const snapshot = adaptReadableSurfaceToHeadlessSnapshot(input);
  const blockNames = snapshot.blocks.map((block) => block.name);
  const blockContent = Object.fromEntries(snapshot.blocks.map((block) => [block.name, block.markdown]));
  const anchorMarkdown = blockNames.map((name) => `<!-- mdan:block ${name} -->`).join("\n\n");
  const markdown = [snapshot.markdown.trim(), anchorMarkdown].filter(Boolean).join("\n\n");
  return {
    frontmatter: {
      ...(input.route ? { route: input.route } : {})
    },
    markdown,
    executableContent: JSON.stringify(input.actions, null, 2),
    blockContent,
    blocks: snapshot.blocks.map(toMdanBlock),
    blockAnchors: [...blockNames],
    visibleBlockNames: [...blockNames]
  };
}
