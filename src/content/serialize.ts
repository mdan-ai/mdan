import type { MdanBlock, MdanFragment, MdanFrontmatter, MdanPage } from "../protocol/types.js";

const blockDirectivePattern = /:::\s*block\{([^}]*)\}([\s\S]*?):::/g;

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
  if (!visibleBlockNames) {
    return page.blockContent;
  }
  return Object.fromEntries(Object.entries(page.blockContent).filter(([name]) => visibleBlockNames.has(name)));
}

function injectBlockContent(markdown: string, blockContent: Record<string, string> | undefined): string {
  if (!blockContent || Object.keys(blockContent).length === 0) {
    return markdown;
  }

  let replaced = false;
  const injected = markdown.replace(blockDirectivePattern, (match, attrs) => {
    const id = extractBlockId(attrs);
    if (!id) {
      return match;
    }
    const content = blockContent[id]?.trim();
    if (!content) {
      return match;
    }
    replaced = true;
    return `::: block{${attrs}}\n${content}\n:::`;
  });

  if (replaced) {
    return injected;
  }

  const appended = [markdown.trim()];
  for (const value of Object.values(blockContent)) {
    const trimmed = value.trim();
    if (trimmed) {
      appended.push(trimmed);
    }
  }
  return appended.filter(Boolean).join("\n\n");
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
  const actions = page.blocks.flatMap((block) => block.operations.map((operation) => toJsonAction(block, operation)));
  const actionIds = actions
    .map((action) => (typeof action.id === "string" ? action.id : null))
    .filter((id): id is string => Boolean(id));

  return {
    ...(typeof frontmatter.app_id === "string" ? { app_id: frontmatter.app_id } : {}),
    ...(typeof frontmatter.state_id === "string" ? { state_id: frontmatter.state_id } : {}),
    ...(typeof frontmatter.state_version === "number" ? { state_version: frontmatter.state_version } : {}),
    ...(typeof frontmatter.response_mode === "string" ? { response_mode: frontmatter.response_mode } : {}),
    blocks: page.blocks.map((block) => block.name),
    actions,
    allowed_next_actions: actionIds
  };
}

function toExecutablePayloadFromFragment(fragment: MdanFragment): Record<string, unknown> {
  const actions = fragment.blocks.flatMap((block) => block.operations.map((operation) => toJsonAction(block, operation)));
  const actionIds = actions
    .map((action) => (typeof action.id === "string" ? action.id : null))
    .filter((id): id is string => Boolean(id));

  return {
    blocks: fragment.blocks.map((block) => block.name),
    actions,
    allowed_next_actions: actionIds
  };
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
    return JSON.stringify({ ...parsed, ...dynamicPayload }, null, 2);
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

export function serializePage(page: MdanPage): string {
  const frontmatter = serializeFrontmatter(page.frontmatter);
  const visibleBlockNames = getVisibleBlockNames(page);
  const markdown = injectBlockContent(
    page.markdown.trim().replace(blockDirectivePattern, (match, attrs) => {
      if (!visibleBlockNames) {
        return match;
      }
      const id = extractBlockId(attrs);
      if (!id || visibleBlockNames.has(id)) {
        return match;
      }
      return "";
    }),
    getVisibleBlockContent(page)
  );
  const executableBlock = serializeExecutableBlock(
    mergeExecutableContent(
      page.executableContent,
      page.blocks.length > 0 ? toExecutablePayloadFromPage(page) : null
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
