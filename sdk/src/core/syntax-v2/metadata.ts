import type { MdanFragment, MdanPage } from "../types.js";

const MDAN_SYNTAX_VERSION = Symbol.for("mdan.syntax-version");

export type SyntaxVersion = "legacy" | "v2";

type MarkedValue = {
  [MDAN_SYNTAX_VERSION]?: SyntaxVersion;
};

function markSyntaxVersion<T extends object>(value: T, version: SyntaxVersion): T {
  Object.defineProperty(value, MDAN_SYNTAX_VERSION, {
    value: version,
    enumerable: false,
    configurable: true
  });
  return value;
}

export function markPageV2(page: MdanPage): MdanPage {
  return markSyntaxVersion(page, "v2");
}

export function markFragmentV2(fragment: MdanFragment): MdanFragment {
  return markSyntaxVersion(fragment, "v2");
}

export function markPageLegacy(page: MdanPage): MdanPage {
  return markSyntaxVersion(page, "legacy");
}

export function markFragmentLegacy(fragment: MdanFragment): MdanFragment {
  return markSyntaxVersion(fragment, "legacy");
}

export function isMarkedV2(value: MdanPage | MdanFragment): boolean {
  return (value as MarkedValue)[MDAN_SYNTAX_VERSION] === "v2";
}

export function isMarkedLegacy(value: MdanPage | MdanFragment): boolean {
  return (value as MarkedValue)[MDAN_SYNTAX_VERSION] === "legacy";
}

export function getSyntaxVersion(value: MdanPage | MdanFragment): SyntaxVersion | undefined {
  return (value as MarkedValue)[MDAN_SYNTAX_VERSION];
}
