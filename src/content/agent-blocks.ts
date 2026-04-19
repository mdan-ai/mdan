export interface AgentBlockEntry {
  id: string | null;
  attrs: Record<string, string>;
  body: string;
}

function stripUntrustedSectionBodies(content: string): string {
  return String(content).replace(/:::\s*block\{([^}]*)\}([\s\S]*?):::/g, (match, attrs) => {
    const trustRaw = attrs.match(/trust="([^"]+)"/)?.[1] ?? null;
    if (trustRaw !== "untrusted") {
      return match;
    }
    return `::: block{${attrs}}\n[untrusted-content]\n:::`;
  });
}

function parseAgentAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRe = /([a-zA-Z_][\w-]*)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = attrRe.exec(raw)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

export function stripAgentBlocks(content: string): string {
  return String(content)
    .replace(/<!--\s*agent:begin\b[^>]*-->[\s\S]*?<!--\s*agent:end\s*-->/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractAgentBlocks(content: unknown): AgentBlockEntry[] {
  const cleaned = stripUntrustedSectionBodies(String(content));
  const blocks: AgentBlockEntry[] = [];
  const beginRe = /<!--\s*agent:begin\b([^>]*)-->/g;
  let beginMatch: RegExpExecArray | null;

  while ((beginMatch = beginRe.exec(cleaned)) !== null) {
    const attrsRaw = beginMatch[1] ?? "";
    const attrs = parseAgentAttrs(attrsRaw);
    const endSearch = cleaned.slice(beginRe.lastIndex);
    const endMatch = /<!--\s*agent:end\s*-->/.exec(endSearch);
    if (!endMatch || endMatch.index == null) {
      break;
    }
    const bodyStart = beginRe.lastIndex;
    const bodyEnd = beginRe.lastIndex + endMatch.index;
    const body = cleaned.slice(bodyStart, bodyEnd).trim();
    blocks.push({
      id: attrs.id ?? null,
      attrs,
      body
    });
    beginRe.lastIndex = bodyEnd + endMatch[0].length;
  }

  return blocks;
}

export function validateAgentBlocks(content: string): string[] {
  const errors: string[] = [];
  const cleaned = stripUntrustedSectionBodies(String(content));
  const beginRe = /<!--\s*agent:begin\b([^>]*)-->/g;
  const endRe = /<!--\s*agent:end\s*-->/g;
  const beginMatches = [...cleaned.matchAll(beginRe)];
  const endMatches = [...cleaned.matchAll(endRe)];

  if (beginMatches.length !== endMatches.length) {
    errors.push("agent blocks must be balanced: each agent:begin needs one agent:end");
  }

  const ids = new Set<string>();
  for (const block of extractAgentBlocks(cleaned)) {
    if (!block.id) {
      errors.push('agent block must include non-empty id (example: <!-- agent:begin id="..." -->)');
    } else if (ids.has(block.id)) {
      errors.push(`agent block id "${block.id}" must be unique`);
    } else {
      ids.add(block.id);
    }
    if (block.body.trim().length === 0) {
      errors.push(`agent block "${block.id ?? "unknown"}" must not be empty`);
    }
    if (/<!--\s*agent:begin\b/i.test(block.body)) {
      errors.push(`agent block "${block.id ?? "unknown"}" must not nest another agent block`);
    }
  }

  return errors;
}
