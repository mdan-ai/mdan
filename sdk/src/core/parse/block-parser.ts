import { MdanParseError } from "../errors.js";
import type { MdanBlock, MdanInput, MdanOperation } from "../types.js";

const identifierPattern = /^[a-zA-Z_][\w-]*$/;

function parseChoiceOptions(text: string): string[] {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new MdanParseError(`Invalid choice options ${text}.`);
  }

  if (!Array.isArray(value)) {
    throw new MdanParseError(`Invalid choice options ${text}.`);
  }

  if (!value.every((option) => typeof option === "string")) {
    throw new MdanParseError(`Invalid choice option in ${text}.`);
  }

  return value;
}

function parseInput(line: string): MdanInput {
  const match = line.match(/^INPUT\s+(text|number|boolean|choice|asset)(?:\s+(required))?(?:\s+(secret))?(?:\s+(\[[^\]]*\]))?\s+->\s+([a-zA-Z_][\w-]*)$/);
  if (!match) {
    throw new MdanParseError(`Invalid INPUT syntax: ${line}`);
  }

  const [, type, required, secret, optionText, name] = match;
  return {
    name: name!,
    type: type as MdanInput["type"],
    required: required === "required",
    secret: secret === "secret",
    ...(optionText ? { options: parseChoiceOptions(optionText) } : {})
  };
}

function parseInputList(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

function parseOperation(line: string): MdanOperation {
  const match = line.match(
    /^(GET|POST)\s+"([^"]+)"(?:\s+\(([^)]*)\))?(?:\s+->\s+([a-zA-Z_][\w-]*))?(?:\s+(auto))?(?:\s+label:"([^"]+)")?(?:\s+accept:"([^"]+)")?$/
  );
  if (!match) {
    throw new MdanParseError(`Invalid operation syntax: ${line}`);
  }

  const [, method, target, inputsRaw, name, auto, label, accept] = match;
  const inputs = parseInputList(inputsRaw);
  if (method === "POST" && inputsRaw === undefined) {
    throw new MdanParseError("POST operations must declare an input list.");
  }
  if (method === "POST" && !name) {
    throw new MdanParseError("POST operations must declare an operation name.");
  }
  return {
    method: method as MdanOperation["method"],
    target,
    name: name || undefined,
    inputs,
    auto: auto === "auto" ? true : undefined,
    label: label || undefined,
    accept: accept || undefined
  } as MdanOperation;
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
      } else if (inner.startsWith("GET ") || inner.startsWith("POST ")) {
        operations.push(parseOperation(inner));
      } else {
        throw new MdanParseError(`Unknown block statement: ${inner}`);
      }
      index += 1;
    }

    if ((lines[index] ?? "").trim() !== "}") {
      throw new MdanParseError(`Unclosed block ${name}.`);
    }

    blocks.push({ name, inputs, operations });
    index += 1;
  }

  return blocks;
}
