export type SemanticSlotName = "Purpose" | "Context" | "Rules" | "Result" | "Examples" | "Views" | "Handoff";

export interface SemanticSlotEntry {
  name: SemanticSlotName;
  body: string;
}

export interface SemanticSlotValidationOptions {
  requiredNames?: SemanticSlotName[];
  minCount?: number;
}

const SEMANTIC_SLOT_NAMES: SemanticSlotName[] = ["Purpose", "Context", "Rules", "Result", "Examples", "Views", "Handoff"];
const SLOT_NAME_MAP = new Map<string, SemanticSlotName>(
  SEMANTIC_SLOT_NAMES.map((name) => [name.toLowerCase(), name])
);

function stripUntrustedSectionBodies(content: string): string {
  return String(content);
}

export function extractSemanticSlots(content: unknown): SemanticSlotEntry[] {
  const cleaned = stripUntrustedSectionBodies(String(content));
  const slots: SemanticSlotEntry[] = [];
  const headingRe = /^##\s+(.+?)\s*$/gm;
  const headings: Array<{
    canonical: SemanticSlotName | null;
    bodyStart: number;
    headingIndex: number;
  }> = [];
  let match: RegExpExecArray | null;

  while ((match = headingRe.exec(cleaned)) !== null) {
    const rawTitle = String(match[1]).trim();
    const canonical = SLOT_NAME_MAP.get(rawTitle.toLowerCase()) ?? null;
    headings.push({
      canonical,
      bodyStart: headingRe.lastIndex,
      headingIndex: match.index
    });
  }

  for (let index = 0; index < headings.length; index += 1) {
    const current = headings[index];
    if (!current.canonical) {
      continue;
    }
    const nextHeading = headings[index + 1];
    const bodyEnd = nextHeading ? nextHeading.headingIndex : cleaned.length;
    slots.push({
      name: current.canonical,
      body: cleaned.slice(current.bodyStart, bodyEnd).trim()
    });
  }

  return slots;
}

export function validateSemanticSlots(content: string, options: SemanticSlotValidationOptions = {}): string[] {
  const errors: string[] = [];
  const cleaned = stripUntrustedSectionBodies(String(content));
  const byName = new Map<SemanticSlotName, SemanticSlotEntry[]>();
  const requiredNames = options.requiredNames ?? [];
  const minCount = options.minCount ?? 0;

  for (const slot of extractSemanticSlots(cleaned)) {
    const existing = byName.get(slot.name) ?? [];
    existing.push(slot);
    byName.set(slot.name, existing);
  }

  const anySlotHeadingRe = /^(#{1,6})\s+(Purpose|Context|Rules|Result|Examples|Views|Handoff)\s*$/gim;
  let headingMatch: RegExpExecArray | null;
  while ((headingMatch = anySlotHeadingRe.exec(cleaned)) !== null) {
    const level = headingMatch[1]?.length ?? 0;
    const slotName = headingMatch[2];
    if (level !== 2) {
      errors.push(`semantic slot "${slotName}" must use H2 heading ("## ${slotName}")`);
    }
  }

  for (const slotName of SEMANTIC_SLOT_NAMES) {
    const entries = byName.get(slotName) ?? [];
    if (entries.length > 1) {
      errors.push(`semantic slot "${slotName}" must appear at most once`);
      continue;
    }
    if (entries.length === 1 && entries[0].body.trim().length === 0) {
      errors.push(`semantic slot "${slotName}" must not be empty`);
    }
    if (requiredNames.includes(slotName) && entries.length === 0) {
      errors.push(`content must include a "## ${slotName}" section`);
    }
  }

  if (minCount > 0) {
    const presentCount = SEMANTIC_SLOT_NAMES.filter((slotName) => (byName.get(slotName) ?? []).length > 0).length;
    if (presentCount < minCount) {
      errors.push(`content must include at least ${minCount} semantic slots`);
    }
  }

  return errors;
}
