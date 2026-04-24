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
  let match: RegExpExecArray | null;

  const commentExpression = /<!--\s*mdan:block\b([^>]*)-->/g;
  while ((match = commentExpression.exec(content)) !== null) {
    const attrs = match[1] ?? "";
    const id = attrs.match(/\bid="([^"]+)"/)?.[1];
    if (!id || byBlock.has(id)) {
      continue;
    }
    byBlock.set(id, []);
  }
  return byBlock;
}

function actionListFromManifest(actions: ReadableSurface["actions"]): JsonAction[] {
  const actionRoot = actions.actions;
  if (actionRoot && typeof actionRoot === "object") {
    return Object.entries(actionRoot)
      .map(([id, action]) => (
        action && typeof action === "object" && !Array.isArray(action)
          ? ({ id, ...action } as JsonAction)
          : null
      ))
      .filter((value): value is JsonAction => Boolean(value));
  }
  return [];
}

function blockNamesFromManifestBlocks(blocks: ReadableSurface["actions"]["blocks"]): string[] {
  if (blocks && typeof blocks === "object") {
    return Object.keys(blocks);
  }
  return [];
}

function blockActionRefsFromManifest(
  blocks: ReadableSurface["actions"]["blocks"],
  blockName: string
): string[] | null {
  if (!blocks || typeof blocks !== "object") {
    return null;
  }
  const block = blocks[blockName];
  if (!block || typeof block !== "object" || Array.isArray(block)) {
    return null;
  }
  const actions = block.actions;
  if (!Array.isArray(actions)) {
    return null;
  }
  return actions.filter((id): id is string => typeof id === "string");
}

function resolveBlockNames(
  actions: ReadableSurface["actions"],
  regions: Record<string, string> | undefined,
  blockActionRefs: Map<string, string[]>,
  actionList: JsonAction[]
): string[] {
  const names: string[] = [];
  for (const name of blockNamesFromManifestBlocks(actions.blocks)) {
    if (!names.includes(name)) {
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
  for (const action of actionList) {
    if (typeof action.block === "string" && !names.includes(action.block)) {
      names.push(action.block);
    }
  }
  return names;
}

function resolveActionsForBlock(
  blockName: string,
  blocks: ReadableSurface["actions"]["blocks"],
  actionList: JsonAction[],
  blockActionRefs: Map<string, string[]>
): JsonAction[] {
  const referencedActions = blockActionRefs.get(blockName);
  const manifestActionRefs = blockActionRefsFromManifest(blocks, blockName);
  const actionRefs = referencedActions && referencedActions.length > 0 ? referencedActions : manifestActionRefs;
  if (actionRefs) {
    const actionById = new Map<string, JsonAction>();
    for (const action of actionList) {
      if (typeof action?.id === "string") {
        actionById.set(action.id, action);
      }
    }
    return actionRefs
      .map((id) => actionById.get(id))
      .filter((value): value is JsonAction => Boolean(value));
  }

  return actionList.filter((action) => {
    return action.block === blockName;
  });
}

export function adaptReadableSurfaceToHeadlessSnapshot(input: ReadableSurface): HeadlessSnapshotLike {
  const rawContent = String(input.markdown ?? "");
  const content = stripReadablePageMarkdown(rawContent);
  const blockActionRefs = parseContentBlocks(rawContent);
  const actionList = actionListFromManifest(input.actions);
  const defaultConfirmationPolicy =
    toConfirmationPolicy(input.actions.security?.default_confirmation_policy) ?? "never";

  const blocks: MdanHeadlessBlock[] = [];
  for (const blockName of resolveBlockNames(input.actions, input.regions, blockActionRefs, actionList)) {
    const actionsForBlock = resolveActionsForBlock(blockName, input.actions.blocks, actionList, blockActionRefs);

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
  return {
    frontmatter: {
      ...(input.route ? { route: input.route } : {})
    },
    markdown: String(input.markdown ?? "").trim(),
    executableContent: JSON.stringify(input.actions, null, 2),
    blockContent,
    blocks: snapshot.blocks.map(toMdanBlock),
    visibleBlockNames: [...blockNames]
  };
}
