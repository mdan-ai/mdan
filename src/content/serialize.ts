import { MDAN_PAGE_MANIFEST_VERSION } from "../core/protocol.js";
import type { MdanBlock, MdanFragment, MdanFrontmatter, MdanPage } from "../core/protocol.js";

const blockAnchorPattern = /<!--\s*mdan:block\b([^>]*)-->\s*(?:\n|$)?/g;

function extractBlockId(attrs: string): string | null {
  const id = attrs.match(/\bid="([^"]+)"/)?.[1]?.trim() ?? "";
  return id || null;
}

function serializeScalar(value: string | number | boolean | null): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  return String(value);
}

function serializeFrontmatter(frontmatter: MdanFrontmatter): string {
  const entries = Object.entries(frontmatter);
  if (entries.length === 0) {
    return "";
  }
  const lines = entries.map(([key, value]) => `${key}: ${serializeScalar(value)}`);
  return `---\n${lines.join("\n")}\n---\n\n`;
}

function getVisibleBlockNames(page: MdanPage): Set<string> | null {
  if (!page.visibleBlockNames || page.visibleBlockNames.length === 0) {
    return null;
  }
  return new Set(page.visibleBlockNames);
}

function getVisibleBlockContent(page: MdanPage): Record<string, string> | undefined {
  if (!page.blockContent) {
    return undefined;
  }
  const visibleBlockNames = getVisibleBlockNames(page);
  const entries = Object.entries(page.blockContent)
    .filter(([name]) => !visibleBlockNames || visibleBlockNames.has(name))
    .map(([name, value]) => [name, value.trim()] as const)
    .filter(([, value]) => value.length > 0);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function serializeExecutableJsonFromBlocks(blocks: MdanBlock[]): string | null {
  if (blocks.length === 0) {
    return null;
  }
  return JSON.stringify({ blocks }, null, 2);
}

function isJsonObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toJsonAction(block: MdanBlock, operation: MdanBlock["operations"][number]): Record<string, unknown> {
  const inputSchema =
    operation.inputSchema && typeof operation.inputSchema === "object" && !Array.isArray(operation.inputSchema)
      ? operation.inputSchema
      : {
          type: "object",
          properties: {},
          additionalProperties: false
        };

  return {
    id: operation.name ?? `${operation.method}:${operation.target}`,
    ...(operation.label ? { label: operation.label } : {}),
    ...(operation.verb ? { verb: operation.verb } : {}),
    target: operation.target,
    ...(operation.auto === true ? { auto: true } : {}),
    ...(operation.actionId ? { action_id: operation.actionId } : {}),
    ...(operation.actionProof ? { action_proof: operation.actionProof } : {}),
    ...(typeof operation.actionIssuedAt === "number" ? { action_issued_at: operation.actionIssuedAt } : {}),
    ...(operation.submitFormat ? { submit_format: operation.submitFormat } : {}),
    ...(typeof operation.requiresConfirmation === "boolean"
      ? { requires_confirmation: operation.requiresConfirmation }
      : {}),
    ...(operation.submitExample ? { submit_example: operation.submitExample } : {}),
    ...(operation.stateEffect
      ? {
          state_effect: {
            ...(operation.stateEffect.responseMode ? { response_mode: operation.stateEffect.responseMode } : {}),
            ...(operation.stateEffect.updatedRegions ? { updated_regions: operation.stateEffect.updatedRegions } : {})
          }
        }
      : {}),
    ...(operation.guard?.riskLevel ? { guard: { risk_level: operation.guard.riskLevel } } : {}),
    ...(operation.security?.confirmationPolicy
      ? { security: { confirmation_policy: operation.security.confirmationPolicy } }
      : {}),
    transport: {
      method: operation.method
    },
    input_schema: inputSchema,
    block: block.name
  };
}

function toExecutablePayloadFromPage(page: MdanPage): Record<string, unknown> {
  const frontmatter = page.frontmatter;
  const visibleBlockContent = getVisibleBlockContent(page);
  const actions = page.blocks.flatMap((block) => block.operations.map((operation) => toJsonAction(block, operation)));
  const actionsById = Object.fromEntries(
    actions
      .map((action) => {
        const id = typeof action.id === "string" ? action.id : "";
        if (!id) {
          return null;
        }
        const { id: _id, block: _block, ...rest } = action;
        return [id, rest] as const;
      })
      .filter((entry): entry is readonly [string, Record<string, unknown>] => Boolean(entry))
  );
  const blockActions = new Map<string, string[]>();
  for (const action of actions) {
    const id = typeof action.id === "string" ? action.id : "";
    const block = typeof action.block === "string" ? action.block : "";
    if (!id || !block) {
      continue;
    }
    const ids = blockActions.get(block) ?? [];
    ids.push(id);
    blockActions.set(block, ids);
  }

  return {
    version: MDAN_PAGE_MANIFEST_VERSION,
    ...(typeof frontmatter.app_id === "string" ? { app_id: frontmatter.app_id } : {}),
    ...(typeof frontmatter.state_id === "string" ? { state_id: frontmatter.state_id } : {}),
    ...(typeof frontmatter.state_version === "number" ? { state_version: frontmatter.state_version } : {}),
    ...(typeof frontmatter.response_mode === "string" ? { response_mode: frontmatter.response_mode } : {}),
    blocks: Object.fromEntries(
      page.blocks.map((block) => [
        block.name,
        {
          actions: blockActions.get(block.name) ?? []
        }
      ])
    ),
    ...(visibleBlockContent && Object.keys(visibleBlockContent).length > 0 ? { regions: visibleBlockContent } : {}),
    actions: actionsById
  };
}

function toExecutablePayloadFromFragment(fragment: MdanFragment): Record<string, unknown> {
  const actions = fragment.blocks.flatMap((block) => block.operations.map((operation) => toJsonAction(block, operation)));
  const actionsById = Object.fromEntries(
    actions
      .map((action) => {
        const id = typeof action.id === "string" ? action.id : "";
        if (!id) {
          return null;
        }
        const { id: _id, block: _block, ...rest } = action;
        return [id, rest] as const;
      })
      .filter((entry): entry is readonly [string, Record<string, unknown>] => Boolean(entry))
  );
  const blockActions = new Map<string, string[]>();
  for (const action of actions) {
    const id = typeof action.id === "string" ? action.id : "";
    const block = typeof action.block === "string" ? action.block : "";
    if (!id || !block) {
      continue;
    }
    const ids = blockActions.get(block) ?? [];
    ids.push(id);
    blockActions.set(block, ids);
  }

  return {
    version: MDAN_PAGE_MANIFEST_VERSION,
    blocks: Object.fromEntries(
      fragment.blocks.map((block) => [
        block.name,
        {
          actions: blockActions.get(block.name) ?? []
        }
      ])
    ),
    actions: actionsById
  };
}

function mergeObjectField(
  base: unknown,
  update: unknown
): unknown {
  if (!isJsonObjectRecord(base) || !isJsonObjectRecord(update)) {
    return update;
  }
  return Object.fromEntries(
    [...new Set([...Object.keys(base), ...Object.keys(update)])].map((key) => [
      key,
      isJsonObjectRecord(base[key]) && isJsonObjectRecord(update[key])
        ? { ...base[key], ...update[key] }
        : update[key] ?? base[key]
    ])
  );
}

function mergeExecutableContent(
  executableContent: string | undefined,
  dynamicPayload: Record<string, unknown> | null
): string | undefined {
  const trimmed = executableContent?.trim();
  if (!trimmed) {
    return dynamicPayload ? JSON.stringify(dynamicPayload, null, 2) : undefined;
  }
  if (!dynamicPayload) {
    return trimmed;
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!isJsonObjectRecord(parsed)) {
      return trimmed;
    }
    const merged = {
      ...parsed,
      ...dynamicPayload,
      ...(parsed.blocks !== undefined || dynamicPayload.blocks !== undefined
        ? { blocks: mergeObjectField(parsed.blocks, dynamicPayload.blocks) }
        : {}),
      ...(parsed.actions !== undefined || dynamicPayload.actions !== undefined
        ? { actions: mergeObjectField(parsed.actions, dynamicPayload.actions) }
        : {})
    };
    return JSON.stringify(merged, null, 2);
  } catch {
    return trimmed;
  }
}

function serializeExecutableBlock(payload: string | undefined): string {
  const trimmed = payload?.trim();
  const payloadText = trimmed || null;
  if (!payloadText) {
    return "";
  }
  return `\`\`\`mdan\n${payloadText}\n\`\`\``;
}

function serializeMarkdownWithVisibleBlockContent(
  markdown: string,
  visibleBlockNames: Set<string> | null,
  _visibleBlockContent: Record<string, string> | undefined
): string {
  const trimmed = markdown.trim();
  const matches = [...trimmed.matchAll(blockAnchorPattern)];
  if (matches.length === 0) {
    return trimmed;
  }

  let result = "";
  let cursor = 0;

  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const attrs = match[1] ?? "";
    const id = extractBlockId(attrs);
    const nextStart = matches[index + 1]?.index ?? trimmed.length;
    const blockBody = trimmed.slice(end, nextStart);

    result += trimmed.slice(cursor, start);

    if (visibleBlockNames && id && !visibleBlockNames.has(id)) {
      result += blockBody;
      cursor = nextStart;
      return;
    }

    result += match[0];
    result += blockBody;
    cursor = nextStart;
  });

  result += trimmed.slice(cursor);
  return result.trim();
}

export function serializePage(page: MdanPage): string {
  const frontmatter = serializeFrontmatter(page.frontmatter);
  const visibleBlockNames = getVisibleBlockNames(page);
  const visibleBlockContent = getVisibleBlockContent(page);
  const dynamicPayload =
    page.blocks.length > 0
      ? toExecutablePayloadFromPage(page)
      : visibleBlockContent && Object.keys(visibleBlockContent).length > 0
        ? { regions: visibleBlockContent }
        : null;
  const markdown = serializeMarkdownWithVisibleBlockContent(page.markdown, visibleBlockNames, visibleBlockContent)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const executableBlock = serializeExecutableBlock(
    mergeExecutableContent(
      page.executableContent,
      dynamicPayload
    ) ?? serializeExecutableJsonFromBlocks(page.blocks) ?? undefined
  );
  const body = executableBlock ? `${markdown}\n\n${executableBlock}` : markdown;
  return `${frontmatter}${body}\n`;
}

export function serializeFragment(fragment: MdanFragment): string {
  const markdown = fragment.markdown.trim();
  const executableBlock = serializeExecutableBlock(
    mergeExecutableContent(
      fragment.executableContent,
      fragment.blocks.length > 0 ? toExecutablePayloadFromFragment(fragment) : null
    ) ?? serializeExecutableJsonFromBlocks(fragment.blocks) ?? undefined
  );
  if (!markdown && !executableBlock) {
    return "";
  }
  const body = [markdown, executableBlock].filter(Boolean).join("\n\n");
  return `${body}\n`;
}
