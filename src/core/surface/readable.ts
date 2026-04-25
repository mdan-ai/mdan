import { stripAgentBlocks, type ReadableSurface } from "../content.js";
import {
  fieldSchemasFromJsonObjectSchema,
  type FieldSchema,
  type JsonAction,
  type MdanBlock,
  type MdanConfirmationPolicy,
  type MdanHeadlessBlock,
  type MdanOperation,
  type MdanOperationStateEffect,
  type MdanPage
} from "../protocol.js";

type JsonObject = Record<string, unknown>;

const confirmationPolicies = new Set<MdanConfirmationPolicy>(["never", "always", "high-and-above"]);

export type HeadlessSnapshotLike = {
  status: "idle" | "loading" | "error";
  route?: string;
  markdown: string;
  blocks: MdanHeadlessBlock[];
};

function isRecord(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

function stripContentBlocks(markdown: string): string {
  return markdown
    .replace(/^\s*<!--\s*mdan:block\b[^>]*-->\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripReadablePageMarkdown(markdown: string): string {
  return stripAgentBlocks(stripContentBlocks(stripFrontmatter(markdown)));
}

export function stripReadableBlockMarkdown(markdown: string): string {
  return stripAgentBlocks(markdown);
}

function toInputNames(action: JsonAction): string[] {
  if (!isRecord(action.input_schema)) {
    return [];
  }
  const properties = isRecord(action.input_schema.properties) ? action.input_schema.properties : {};
  return Object.keys(properties);
}

function toMethod(action: JsonAction): "GET" | "POST" {
  const method = typeof action.transport?.method === "string" ? action.transport.method.toUpperCase() : "";
  if (method === "GET") {
    return "GET";
  }
  if (method === "POST") {
    return "POST";
  }
  const verb = typeof action.verb === "string" ? action.verb.toLowerCase() : "";
  if (verb === "route" || verb === "read") {
    return "GET";
  }
  return "POST";
}

function toConfirmationPolicy(value: unknown): MdanConfirmationPolicy | null {
  if (typeof value !== "string") {
    return null;
  }
  return confirmationPolicies.has(value as MdanConfirmationPolicy) ? (value as MdanConfirmationPolicy) : null;
}

function resolveConfirmationPolicy(action: JsonAction, defaultPolicy: MdanConfirmationPolicy): MdanConfirmationPolicy {
  return toConfirmationPolicy(action.security?.confirmation_policy) ?? defaultPolicy;
}

function toStateEffect(action: JsonAction): MdanOperationStateEffect | undefined {
  if (!isRecord(action.state_effect)) {
    return undefined;
  }

  const stateEffect: MdanOperationStateEffect = {};
  if (action.state_effect.response_mode === "page" || action.state_effect.response_mode === "region") {
    stateEffect.responseMode = action.state_effect.response_mode;
  }
  if (Array.isArray(action.state_effect.updated_regions)) {
    stateEffect.updatedRegions = action.state_effect.updated_regions.filter(
      (entry): entry is string => typeof entry === "string"
    );
  }
  return Object.keys(stateEffect).length > 0 ? stateEffect : undefined;
}

function toInputSchema(action: JsonAction): Record<string, unknown> | undefined {
  const schema = action.input_schema;
  if (!isRecord(schema)) {
    return undefined;
  }
  return schema;
}

function toOperation(action: JsonAction, defaultPolicy: MdanConfirmationPolicy): MdanOperation | null {
  const id = typeof action.id === "string" ? action.id : "";
  const target = typeof action.target === "string" ? action.target : "";
  if (!id || !target) {
    return null;
  }

  const method = toMethod(action);
  const inputs = toInputNames(action);
  const label = typeof action.label === "string" ? action.label : undefined;
  const confirmationPolicy = resolveConfirmationPolicy(action, defaultPolicy);
  const stateEffect = toStateEffect(action);
  const inputSchema = toInputSchema(action);
  const auto = method === "GET" && action.auto === true;
  const guard =
    typeof action.guard?.risk_level === "string"
      ? { riskLevel: action.guard.risk_level }
      : undefined;
  const semantics = {
    ...(typeof action.verb === "string" ? { verb: action.verb } : {}),
    ...(stateEffect ? { stateEffect } : {}),
    ...(guard ? { guard } : {}),
    ...(inputSchema ? { inputSchema } : {}),
    ...(typeof action.action_id === "string" ? { actionId: action.action_id } : {}),
    ...(typeof action.action_proof === "string" ? { actionProof: action.action_proof } : {}),
    ...(typeof action.action_issued_at === "number" ? { actionIssuedAt: action.action_issued_at } : {}),
    ...(typeof action.submit_format === "string" ? { submitFormat: action.submit_format } : {}),
    ...(typeof action.requires_confirmation === "boolean"
      ? { requiresConfirmation: action.requires_confirmation }
      : {}),
    ...(isRecord(action.submit_example) ? { submitExample: action.submit_example } : {}),
    security: {
      confirmationPolicy
    }
  };

  return {
    method,
    target,
    name: id,
    inputs,
    ...(auto ? { auto } : {}),
    ...(label ? { label } : {}),
    ...semantics
  };
}

function fieldSchemaCompatibilitySignature(input: FieldSchema): string {
  return JSON.stringify({
    kind: input.kind,
    format: input.format,
    required: input.required,
    secret: input.secret,
    options: input.options ?? null
  });
}

function blockInputsFromActions(actions: JsonAction[]): FieldSchema[] {
  const byName = new Map<string, FieldSchema>();

  for (const action of actions) {
    if (!isRecord(action.input_schema)) {
      continue;
    }
    for (const entry of fieldSchemasFromJsonObjectSchema(action.input_schema)) {
      const existing = byName.get(entry.name);
      if (!existing) {
        byName.set(entry.name, entry);
        continue;
      }
      if (fieldSchemaCompatibilitySignature(existing) !== fieldSchemaCompatibilitySignature(entry)) {
        continue;
      }
      byName.set(entry.name, {
        ...existing,
        required: existing.required || entry.required,
        description: existing.description ?? entry.description,
        defaultValue: existing.defaultValue ?? entry.defaultValue,
        constraints: existing.constraints ?? entry.constraints,
        rawSchema: existing.rawSchema ?? entry.rawSchema
      });
    }
  }

  return [...byName.values()];
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

  return actionList.filter((action) => action.block === blockName);
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
