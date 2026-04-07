import { MdanParseError } from "../errors.js";
import { parseAnchors } from "../parse/anchors.js";
import { extractExecutableBlock } from "../parse/executable-block.js";
import { parseFrontmatter } from "../parse/frontmatter.js";
import type { MdanBlock, MdanInput, MdanOperation, MdanPage } from "../types.js";

import { validatePage } from "./validate.js";

const identifierPattern = /^[a-zA-Z_][\w-]*$/;
const continuationKeywords = ["WITH", "LABEL", "AUTO", "ACCEPT"] as const;

function parseChoiceOptions(text: string): string[] {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new MdanParseError(`Invalid choice options ${text}.`);
  }

  if (!Array.isArray(value) || !value.every((option) => typeof option === "string")) {
    throw new MdanParseError(`Invalid choice options ${text}.`);
  }

  return value;
}

function parseInput(line: string): MdanInput {
  const match = line.match(
    /^INPUT\s+([a-zA-Z_][\w-]*):(text|number|boolean|choice|asset)(?:\s+(required))?(?:\s+(secret))?(?:\s+(\[[^\]]*\]))?$/
  );
  if (!match) {
    throw new MdanParseError(`Invalid INPUT syntax: ${line}`);
  }

  const [, name, type, required, secret, options] = match;
  return {
    name: name!,
    type: type as MdanInput["type"],
    required: required === "required",
    secret: secret === "secret",
    ...(options ? { options: parseChoiceOptions(options) } : {})
  };
}

function parseInputList(text: string): string[] {
  return text
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

interface PendingOperation {
  method: "GET" | "POST";
  name: string;
  target: string;
  inputs: string[];
  label?: string;
  auto?: boolean;
  accept?: string;
}

function consumeClause(remaining: string, operation: PendingOperation): string {
  const trimmed = remaining.trimStart();
  if (!trimmed) {
    return "";
  }

  let match = trimmed.match(
    /^WITH\s+([a-zA-Z_][\w-]*(?:\s*,\s*[a-zA-Z_][\w-]*)*)(?=$|\s+(?:LABEL|AUTO|ACCEPT)\b)/
  );
  if (match) {
    operation.inputs = parseInputList(match[1]!);
    return trimmed.slice(match[0].length);
  }

  match = trimmed.match(/^LABEL\s+"([^"]+)"(?=$|\s+(?:AUTO|ACCEPT)\b)/);
  if (match) {
    operation.label = match[1]!;
    return trimmed.slice(match[0].length);
  }

  match = trimmed.match(/^AUTO(?=$|\s+ACCEPT\b)/);
  if (match) {
    operation.auto = true;
    return trimmed.slice(match[0].length);
  }

  match = trimmed.match(/^ACCEPT\s+"([^"]+)"$/);
  if (match) {
    operation.accept = match[1]!;
    return trimmed.slice(match[0].length);
  }

  throw new MdanParseError(`Unknown continuation clause: ${trimmed}`);
}

function applyClauses(clauseText: string, operation: PendingOperation): void {
  let remaining = clauseText;
  while (remaining.trim()) {
    remaining = consumeClause(remaining, operation);
  }
}

function parseOperationHead(line: string): PendingOperation {
  const match = line.match(/^(GET|POST)\s+([a-zA-Z_][\w-]*)\s+"([^"]+)"(.*)$/);
  if (!match) {
    throw new MdanParseError(`Invalid operation syntax: ${line}`);
  }

  const [, method, name, target, clauses] = match;
  const operation: PendingOperation = {
    method: method as "GET" | "POST",
    name: name!,
    target: target!,
    inputs: []
  };

  if (clauses?.trim()) {
    applyClauses(clauses, operation);
  }

  return operation;
}

function isContinuationLine(line: string): boolean {
  const trimmed = line.trim();
  return continuationKeywords.some((keyword) => trimmed.startsWith(`${keyword} `) || trimmed === keyword);
}

function parseOperation(lines: string[], startIndex: number): { operation: MdanOperation; nextIndex: number } {
  const head = parseOperationHead((lines[startIndex] ?? "").trim());
  let index = startIndex + 1;

  while (index < lines.length) {
    const raw = lines[index] ?? "";
    const trimmed = raw.trim();
    if (!trimmed) {
      index += 1;
      continue;
    }
    if (/^\s+/.test(raw) && /^[A-Z]/.test(trimmed) && !/^(INPUT|GET|POST|})\b/.test(trimmed)) {
      applyClauses(trimmed, head);
      index += 1;
      continue;
    }
    if (!isContinuationLine(raw)) {
      break;
    }
    applyClauses(trimmed, head);
    index += 1;
  }

  return {
    operation: head as MdanOperation,
    nextIndex: index
  };
}

export function parseBlocks(source: string): MdanBlock[] {
  if (!source.trim()) {
    return [];
  }

  const blocks: MdanBlock[] = [];
  const lines = source.split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = (lines[index] ?? "").trim();
    if (!line) {
      index += 1;
      continue;
    }

    const blockMatch = line.match(/^BLOCK\s+([a-zA-Z_][\w-]*)\s*\{$/);
    if (!blockMatch) {
      throw new MdanParseError(`Expected BLOCK declaration, received: ${line}`);
    }

    const name = blockMatch[1]!;
    if (!identifierPattern.test(name)) {
      throw new MdanParseError(`Invalid block name ${name}.`);
    }

    const inputs: MdanInput[] = [];
    const operations: MdanOperation[] = [];
    index += 1;

    while (index < lines.length) {
      const inner = (lines[index] ?? "").trim();
      if (!inner) {
        index += 1;
        continue;
      }
      if (inner === "}") {
        break;
      }
      if (inner.startsWith("INPUT ")) {
        inputs.push(parseInput(inner));
        index += 1;
        continue;
      }
      if (inner.startsWith("GET ") || inner.startsWith("POST ")) {
        const parsed = parseOperation(lines, index);
        operations.push(parsed.operation);
        index = parsed.nextIndex;
        continue;
      }

      throw new MdanParseError(`Unknown block statement: ${inner}`);
    }

    if ((lines[index] ?? "").trim() !== "}") {
      throw new MdanParseError(`Unclosed block ${name}.`);
    }

    blocks.push({ name, inputs, operations });
    index += 1;
  }

  return blocks;
}

export function parsePage(source: string): MdanPage {
  const { frontmatter, body } = parseFrontmatter(source);
  const { markdown, executableContent } = extractExecutableBlock(body);
  const page: MdanPage = {
    frontmatter,
    markdown,
    blocks: parseBlocks(executableContent),
    blockAnchors: parseAnchors(markdown)
  };
  return validatePage(page);
}
