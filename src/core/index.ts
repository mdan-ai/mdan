export {
  basicMarkdownRenderer,
  parseFrontmatter,
  parseReadableSurface,
  serializeFragment,
  serializePage,
  stripAgentBlocks,
  validateAgentBlocks,
  validateContentPair,
  type MdanMarkdownRenderContext,
  type MdanMarkdownRenderer,
  type ParseMarkdownSurfaceOptions,
  type ReadableSurface
} from "./content.js";

export {
  createExecutableContent,
  createMarkdownFragment,
  createMarkdownPage,
  isProjectableReadableSurface,
  normalizeReadableSurface,
  parseReadableMarkdownResponse,
  projectReadableSurfaceToPage,
  serializeMarkdownFragment,
  serializeMarkdownPage,
  validateMarkdownAgentBlocks,
  validateMarkdownContentPair,
  type CreateMarkdownFragmentOptions,
  type CreateMarkdownPageOptions
} from "./surface/markdown.js";

export {
  assertActionsContractEnvelope,
  fieldSchemaFromJsonSchema,
  fieldSchemasFromJsonObjectSchema,
  MDAN_PAGE_MANIFEST_VERSION,
  negotiateRepresentation,
  normalizeInputValuesByFieldSchemas,
  normalizeInputValuesBySchema,
  resolveFieldFormat,
  resolveFieldKind,
  type FieldFormat,
  type FieldKind,
  type FieldSchema,
  type JsonAction,
  type JsonBlock,
  type JsonObjectSchema,
  type MdanActionManifest,
  type MdanActionMethod,
  type MdanActionVerb,
  type MdanBlock,
  type MdanBlockTrust,
  type MdanConfirmationPolicy,
  type MdanFragment,
  type MdanFrontmatter,
  type MdanHeadlessBlock,
  type MdanOperation,
  type MdanOperationStateEffect,
  type MdanPage,
  type MdanResponseMode,
  type MdanRiskLevel,
  type MdanSubmitValue,
  type MdanSubmitValues
} from "./protocol.js";

export {
  getReadableSurfaceViolation,
  validateContentActionConsistency,
  type ReadableSurfaceValidationOptions,
  type ReadableSurfaceViolation,
  type SurfaceContractViolation
} from "./surface/validation.js";
