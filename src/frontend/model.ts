import {
  basicMarkdownRenderer,
  humanizeInputLabel,
  resolveActionBehavior,
  resolveActionVariant,
  resolveFieldFormat,
  resolveFieldKind,
  type FieldSchema,
  type MdanMarkdownRenderer,
  type MdanOperation,
  type MdanSubmitValue,
  type MdanSubmitValues
} from "../core/surface/presentation.js";
import {
  buildOperationPayload,
  createInputsByName,
  getInputValue,
  resolveFormEnctype,
  resolveRenderableInputs,
  resolveDispatchAction,
  shouldOmitEmptyInput
} from "../core/surface/forms.js";
import type { FrontendSnapshot, FrontendUiHost } from "./contracts.js";

export { basicMarkdownRenderer, humanizeInputLabel, type MdanMarkdownRenderer };
export type { FieldSchema, MdanOperation, MdanSubmitValue, MdanSubmitValues };
export type { FrontendSnapshot, FrontendUiHost };

function getFormKey(blockName: string, operation: { method: string; target: string; name?: string }): string {
  return `${blockName}:${operation.method}:${operation.target}:${operation.name ?? ""}`;
}

export interface ActionPresentation {
  variant: "primary" | "secondary" | "quiet" | "danger";
  behavior: "page" | "region" | "submit" | "read";
}

function resolveActionPresentation(operation: MdanOperation): ActionPresentation {
  return {
    variant: resolveActionVariant(operation),
    behavior: resolveActionBehavior(operation)
  };
}

export interface InputCapabilities {
  control: "select" | "checkbox" | "file" | "textarea" | "input";
  inputType: "text" | "number" | "password" | null;
  valueChannel: "value" | "checked" | "file";
}

function resolveInputCapabilities(input: Pick<FieldSchema, "kind" | "secret"> & Partial<Pick<FieldSchema, "format">>): InputCapabilities {
  const kind = resolveFieldKind(input);
  if (kind === "enum") {
    return { control: "select", inputType: null, valueChannel: "value" };
  }
  if (kind === "boolean") {
    return { control: "checkbox", inputType: null, valueChannel: "checked" };
  }
  if (kind === "asset") {
    return { control: "file", inputType: null, valueChannel: "file" };
  }
  if (kind === "object" || kind === "array") {
    return { control: "textarea", inputType: null, valueChannel: "value" };
  }
  if (resolveFieldFormat(input) === "textarea") {
    return { control: "textarea", inputType: null, valueChannel: "value" };
  }
  return {
    control: "input",
    inputType: resolveFieldFormat(input) === "password" ? "password" : kind === "number" || kind === "integer" ? "number" : "text",
    valueChannel: "value"
  };
}

export interface UiFieldView {
  name: string;
  label: string;
  description: string | null;
  required: boolean;
  value: string;
  omitEmpty: boolean;
  control: InputCapabilities["control"];
  inputType: InputCapabilities["inputType"];
  options: string[];
  constraints: FieldSchema["constraints"];
  source: FieldSchema;
}

export interface UiHiddenFieldView {
  name: string;
  value: string;
}

export interface UiOperationView {
  formKey: string;
  method: "GET" | "POST";
  methodAttribute: "get" | "post";
  target: string;
  label: string;
  enctype: string;
  actionVariant: ActionPresentation["variant"];
  actionBehavior: ActionPresentation["behavior"];
  hiddenFields: UiHiddenFieldView[];
  fields: UiFieldView[];
  source: MdanOperation;
}

export interface UiBlockView {
  name: string;
  markdown: string;
  operations: UiOperationView[];
}

export interface UiSnapshotView {
  status: FrontendSnapshot["status"];
  error?: string;
  route?: string;
  markdown: string;
  blocks: UiBlockView[];
}

function resolveUiFieldView(
  input: FieldSchema,
  formValues: MdanSubmitValues,
  method: "GET" | "POST"
): UiFieldView {
  const capabilities = resolveInputCapabilities(input);
  return {
    name: input.name,
    label: humanizeInputLabel(input.name, { titleCase: true }),
    description:
      typeof input.description === "string" && input.description.trim().length > 0
        ? input.description
        : null,
    required: input.required,
    value: getInputValue(input, formValues, method),
    omitEmpty: shouldOmitEmptyInput(input, method),
    control: capabilities.control,
    inputType: capabilities.inputType,
    options: input.options ?? [],
    constraints: input.constraints,
    source: input
  };
}

function resolveUiOperationView(
  blockName: string,
  operation: MdanOperation,
  inputsByName: Map<string, FieldSchema>,
  formValues: MdanSubmitValues
): UiOperationView {
  const renderableInputs = resolveRenderableInputs(operation, inputsByName);
  const presentation = resolveActionPresentation(operation);
  const hiddenFields: UiHiddenFieldView[] = [];
  if (typeof operation.actionProof === "string") {
    hiddenFields.push({ name: "action.proof", value: operation.actionProof });
  }
  if (operation.method === "POST" && operation.inputSchema && operation.inputs.length > 0) {
    hiddenFields.push({
      name: "mdan.input_schema",
      value: JSON.stringify(operation.inputSchema)
    });
  }

  return {
    formKey: getFormKey(blockName, operation),
    method: operation.method,
    methodAttribute: operation.method === "GET" ? "get" : "post",
    target: operation.target,
    label: operation.label ?? operation.name ?? operation.target,
    enctype: resolveFormEnctype(renderableInputs),
    actionVariant: presentation.variant,
    actionBehavior: presentation.behavior,
    hiddenFields,
    fields: renderableInputs.map((input) => resolveUiFieldView(input, formValues, operation.method)),
    source: operation
  };
}

export function resolveUiSnapshotView(
  snapshot: FrontendSnapshot,
  resolveFormValues: (formKey: string) => MdanSubmitValues = () => ({})
): UiSnapshotView {
  return {
    status: snapshot.status,
    ...(snapshot.error ? { error: snapshot.error } : {}),
    ...(snapshot.route ? { route: snapshot.route } : {}),
    markdown: snapshot.markdown,
    blocks: snapshot.blocks.map((block) => {
      const inputsByName = createInputsByName(block.inputs);
      return {
        name: block.name,
        markdown: block.markdown,
        operations: block.operations.map((operation) => {
          const formKey = getFormKey(block.name, operation);
          return resolveUiOperationView(block.name, operation, inputsByName, resolveFormValues(formKey));
        })
      };
    })
  };
}

export async function submitUiOperation(
  host: Pick<FrontendUiHost, "submit" | "visit">,
  operation: UiOperationView,
  formValues: MdanSubmitValues
): Promise<void> {
  const payload = buildOperationPayload(
    operation.source,
    new Map(operation.fields.map((field) => [field.name, field.source])),
    formValues
  );
  const action = resolveDispatchAction(operation.source, payload);
  if (action.kind === "visit") {
    await host.visit(action.target);
    return;
  }
  await host.submit(action.operation, action.payload);
}
