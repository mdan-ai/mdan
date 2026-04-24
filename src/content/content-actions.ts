type UnknownRecord = Record<string, string | number | boolean | null>;

export interface ContentSection {
  id: string;
  actions: string[];
  trust: "trusted" | "untrusted" | "unknown";
  body: string;
}

export interface ContentPairViolation {
  path: string;
  message: string;
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRe = /([a-zA-Z_][\w-]*)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = attrRe.exec(raw)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

export function parseFrontmatter(content: string): UnknownRecord {
  const match = String(content).match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match?.[1]) {
    return {};
  }
  const lines = match[1].split("\n");
  const result: UnknownRecord = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf(":");
    if (separator <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    const raw = trimmed.slice(separator + 1).trim();
    if (!key) {
      continue;
    }
    if (raw === "true" || raw === "false") {
      result[key] = raw === "true";
      continue;
    }
    if (raw === "null") {
      result[key] = null;
      continue;
    }
    if (/^-?\d+(\.\d+)?$/.test(raw)) {
      result[key] = Number(raw);
      continue;
    }
    result[key] = raw.replace(/^"|"$/g, "");
  }
  return result;
}

export function extractSections(content: string): ContentSection[] {
  const sections: ContentSection[] = [];
  let match: RegExpExecArray | null;

  const blockCommentRe = /^\s*<!--\s*mdan:block\b([^>]*)-->\s*$/gm;
  while ((match = blockCommentRe.exec(String(content))) !== null) {
    const attrs = parseAttrs(match[1] ?? "");
    const id = (attrs.id ?? "").trim();
    if (!id) {
      continue;
    }
    sections.push({
      id,
      actions: [],
      trust: "unknown",
      body: ""
    });
  }

  return sections;
}

export function extractRegionTrust(content: string): Record<string, "trusted" | "untrusted" | "unknown"> {
  const trustByRegion: Record<string, "trusted" | "untrusted" | "unknown"> = {};
  for (const section of extractSections(content)) {
    trustByRegion[section.id] = section.trust;
  }
  return trustByRegion;
}

export function validateContentPair(content: string, actionIds: Iterable<string>): ContentPairViolation[] {
  const violations: ContentPairViolation[] = [];
  const ids = new Set(actionIds);
  const seenBlockIds = new Set<string>();

  for (const section of extractSections(content)) {
    if (seenBlockIds.has(section.id)) {
      violations.push({
        path: `content.block[${section.id}].id`,
        message: `duplicate block id: "${section.id}"`
      });
    } else {
      seenBlockIds.add(section.id);
    }

    const seenActionRefs = new Set<string>();
    for (const actionId of section.actions) {
      if (seenActionRefs.has(actionId)) {
        violations.push({
          path: `content.block[${section.id}].actions`,
          message: `duplicate action id reference: "${actionId}"`
        });
        continue;
      }
      seenActionRefs.add(actionId);

      if (!ids.has(actionId)) {
        violations.push({
          path: `content.block[${section.id}].actions`,
          message: `block references unknown action id: "${actionId}"`
        });
      }
    }
  }

  return violations;
}
