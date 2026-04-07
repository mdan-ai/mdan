import type { MdanOperation } from "../core/types.js";

export function humanizeInputLabel(value: string, options: { titleCase?: boolean } = {}): string {
  const normalized = value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (options.titleCase) {
    return normalized.replace(/\b\w/g, (match) => match.toUpperCase());
  }

  return normalized;
}

export function resolveActionVariant(operation: MdanOperation): "primary" | "secondary" | "quiet" {
  const signature = `${operation.name ?? ""} ${operation.label ?? ""} ${operation.target}`.toLowerCase();
  if (signature.includes("logout") || signature.includes("log out")) {
    return "quiet";
  }
  if (operation.method === "GET") {
    return "secondary";
  }
  return "primary";
}
