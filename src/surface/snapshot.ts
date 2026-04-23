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

function defaultValueForInput(input: FieldSchema, method: "get" | "post"): string {
  const kind = resolveFieldKind(input);

  // GET query forms should prefer omission over prefilled values so the URL
  // reflects only what the human actually chose.
  if (method === "get" && !input.required) {
    if (kind === "boolean") {
      return input.defaultValue === true ? "true" : "";
    }
    return "";
  }

  if (input.defaultValue !== undefined && input.defaultValue !== null) {
    return String(input.defaultValue);
  }
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

function renderInput(input: FieldSchema, method: "get" | "post"): string {
  const label = escapeHtml(humanizeInputLabel(input.name, { titleCase: true }));
  const name = escapeHtml(input.name);
  const required = input.required ? " required" : "";
  const omitEmpty = method === "get" && !input.required ? ' data-mdan-omit-empty="true"' : "";
  const description =
    typeof input.description === "string" && input.description.trim().length > 0
      ? `<small>${escapeHtml(input.description)}</small>`
      : "";
  const kind = resolveFieldKind(input);
  const format = resolveFieldFormat(input);
  const value = escapeHtml(defaultValueForInput(input, method));

  if (kind === "enum") {
    const placeholder =
      method === "get" && !input.required
        ? `<option value="" selected>default</option>`
        : "";
    const options = (input.options ?? [])
      .map((option) => {
        const escaped = escapeHtml(option);
        const selected = value === escaped ? " selected" : "";
        return `<option value="${escaped}"${selected}>${escaped}</option>`;
      })
      .join("");
    return `<label><span>${label}</span><select name="${name}"${required}${omitEmpty}>${placeholder}${options}</select>${description}</label>`;
  }

  if (kind === "boolean") {
    const hiddenFalse = method === "post" ? `<input type="hidden" name="${name}" value="false">` : "";
    const checked = value === "true" ? " checked" : "";
    return `<label><span>${label}</span>${hiddenFalse}<input type="checkbox" name="${name}" value="true"${checked}${omitEmpty}>${description}</label>`;
  }

  if (kind === "asset") {
    return `<label><span>${label}</span><input type="file" name="${name}"${required}${omitEmpty}>${description}</label>`;
  }

  if (kind === "object" || kind === "array" || format === "textarea") {
    return `<label><span>${label}</span><textarea name="${name}"${required}${omitEmpty}>${value}</textarea>${description}</label>`;
  }

  const type = format === "password" ? "password" : kind === "number" || kind === "integer" ? "number" : "text";
  return `<label><span>${label}</span><input type="${type}" name="${name}" value="${value}"${required}${omitEmpty}>${description}</label>`;
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
    method === "post" && operation.inputSchema && operation.inputs.length > 0
      ? `<input type="hidden" name="mdan.input_schema" value="${escapeHtml(JSON.stringify(operation.inputSchema))}">`
      : "";
  const fields = renderableInputs.map((input) => renderInput(input, method)).join("");
  const label = escapeHtml(operation.label ?? operation.name ?? operation.target);
  const trimEmptyOnSubmit =
    method === "get"
      ? ' onsubmit="for (const el of this.querySelectorAll(\'[data-mdan-omit-empty=&quot;true&quot;]\')) { if (el instanceof HTMLInputElement && el.type === \'checkbox\') { if (!el.checked) el.disabled = true; continue; } if (\'value\' in el && !el.value) el.disabled = true; }"'
      : "";

  return `<form action="${escapeHtml(operation.target)}" method="${method}" enctype="${enctype}"${trimEmptyOnSubmit}>${actionProof}${inputSchema}${fields}<button type="submit">${label}</button></form>`;
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
