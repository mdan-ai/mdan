import {
  basicMarkdownRenderer,
  stripReadableBlockMarkdown,
  stripReadablePageMarkdown,
  type MdanMarkdownRenderer,
  type ReadableSurface
} from "./content.js";
import {
  resolveFieldFormat,
  resolveFieldKind,
  type FieldSchema,
  type MdanHeadlessBlock,
  type MdanOperation
} from "./protocol-model.js";
import { humanizeInputLabel } from "./render-semantics.js";
import { adaptReadableSurfaceToHeadlessSnapshot } from "./adapter.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function defaultValueForInput(input: FieldSchema): string {
  if (input.defaultValue !== undefined && input.defaultValue !== null) {
    return String(input.defaultValue);
  }
  const kind = resolveFieldKind(input);
  if (kind === "boolean") {
    return "false";
  }
  if (kind === "object") {
    return "{}";
  }
  if (kind === "array") {
    return "[]";
  }
  if (kind === "enum") {
    return input.options?.[0] ?? "";
  }
  return "";
}

function renderInput(input: FieldSchema): string {
  const label = escapeHtml(humanizeInputLabel(input.name, { titleCase: true }));
  const name = escapeHtml(input.name);
  const required = input.required ? " required" : "";
  const description =
    typeof input.description === "string" && input.description.trim().length > 0
      ? `<small>${escapeHtml(input.description)}</small>`
      : "";
  const kind = resolveFieldKind(input);
  const format = resolveFieldFormat(input);
  const value = escapeHtml(defaultValueForInput(input));

  if (kind === "enum") {
    const options = (input.options ?? [])
      .map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
      .join("");
    return `<label><span>${label}</span><select name="${name}"${required}>${options}</select>${description}</label>`;
  }

  if (kind === "boolean") {
    return `<label><span>${label}</span><input type="hidden" name="${name}" value="false"><input type="checkbox" name="${name}" value="true">${description}</label>`;
  }

  if (kind === "asset") {
    return `<label><span>${label}</span><input type="file" name="${name}"${required}>${description}</label>`;
  }

  if (kind === "object" || kind === "array" || format === "textarea") {
    return `<label><span>${label}</span><textarea name="${name}"${required}>${value}</textarea>${description}</label>`;
  }

  const type = format === "password" ? "password" : kind === "number" || kind === "integer" ? "number" : "text";
  return `<label><span>${label}</span><input type="${type}" name="${name}" value="${value}"${required}>${description}</label>`;
}

function renderOperation(block: MdanHeadlessBlock, operation: MdanOperation): string {
  const inputsByName = new Map(block.inputs.map((input) => [input.name, input]));
  const renderableInputs = operation.inputs.map((name) => inputsByName.get(name)).filter((input): input is FieldSchema => Boolean(input));
  const enctype = renderableInputs.some((input) => resolveFieldKind(input) === "asset")
    ? "multipart/form-data"
    : "application/x-www-form-urlencoded";
  const method = operation.method === "GET" ? "get" : "post";
  const actionProof =
    typeof operation.actionProof === "string"
      ? `<input type="hidden" name="action.proof" value="${escapeHtml(operation.actionProof)}">`
      : "";
  const inputSchema =
    operation.inputSchema && operation.inputs.length > 0
      ? `<input type="hidden" name="mdan.input_schema" value="${escapeHtml(JSON.stringify(operation.inputSchema))}">`
      : "";
  const fields = renderableInputs.map((input) => renderInput(input)).join("");
  const label = escapeHtml(operation.label ?? operation.name ?? operation.target);

  return `<form action="${escapeHtml(operation.target)}" method="${method}" enctype="${enctype}">${actionProof}${inputSchema}${fields}<button type="submit">${label}</button></form>`;
}

export interface RenderSurfaceSnapshotOptions {
  markdownRenderer?: MdanMarkdownRenderer;
}

function renderBlock(block: MdanHeadlessBlock, markdownRenderer: MdanMarkdownRenderer): string {
  const markdown = block.markdown
    ? markdownRenderer.render(stripReadableBlockMarkdown(block.markdown), {
        kind: "block",
        blockName: block.name
      })
    : "";
  const operations = block.operations.map((operation) => renderOperation(block, operation)).join("");
  return `<section data-mdan-block="${escapeHtml(block.name)}">${markdown}${operations}</section>`;
}

export function renderSurfaceSnapshot(
  surface: ReadableSurface | undefined,
  options: RenderSurfaceSnapshotOptions = {}
): string {
  if (!surface) {
    return "";
  }

  const markdownRenderer = options.markdownRenderer ?? basicMarkdownRenderer;
  const snapshot = adaptReadableSurfaceToHeadlessSnapshot(surface);
  const pageHtml = markdownRenderer.render(stripReadablePageMarkdown(surface.markdown), {
    kind: "page",
    route: surface.route
  });
  const blocks = snapshot.blocks.map((block) => renderBlock(block, markdownRenderer)).join("\n");
  return [pageHtml, blocks].filter(Boolean).join("\n");
}
