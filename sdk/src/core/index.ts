import {
  composePageV2,
  parseAndValidatePageV2,
  parsePageV2,
  serializeFragmentV2,
  serializePageV2,
  validatePageV2
} from "./syntax-v2/index.js";

export * from "./errors.js";
export * from "./markdown-renderer.js";
export * from "./markdown-body.js";
export * from "./negotiate.js";
export * from "./syntax-v2/index.js";
export * from "./types.js";

export const parsePage = parsePageV2;
export const parseAndValidatePage = parseAndValidatePageV2;
export const composePage = composePageV2;
export const validatePage = validatePageV2;
export const serializePage = serializePageV2;
export const serializeFragment = serializeFragmentV2;
