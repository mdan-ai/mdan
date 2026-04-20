import {
  basicMarkdownRenderer,
  humanizeInputLabel,
  normalizeInputValuesByFieldSchemas,
  resolveActionBehavior,
  resolveActionVariant,
  resolveDispatchMode,
  resolveFieldFormat,
  resolveFieldKind,
  type FieldSchema,
  type MdanMarkdownRenderer,
  type MdanOperation,
  type MdanSubmitValue,
  type MdanSubmitValues
} from "../surface/presentation.js";

export { basicMarkdownRenderer, humanizeInputLabel, type MdanMarkdownRenderer };
export type { FieldSchema, MdanOperation, MdanSubmitValue, MdanSubmitValues };

export interface OperationGroups {
  getOperations: MdanOperation[];
  postOperations: MdanOperation[];
}

export function groupOperations(operations: MdanOperation[]): OperationGroups {
  const groups: OperationGroups = {
    getOperations: [],
    postOperations: []
  };
  for (const operation of operations) {
    if (operation.method === "GET") {
      groups.getOperations.push(operation);
    } else {
      groups.postOperations.push(operation);
    }
  }
  return groups;
}

export function createInputsByName(inputs: FieldSchema[]): Map<string, FieldSchema> {
  return new Map(inputs.map((input) => [input.name, input]));
}

export function resolveRenderableInputs(
  operation: MdanOperation,
  inputsByName: Map<string, FieldSchema>
): FieldSchema[] {
  return operation.inputs
    .map((name) => inputsByName.get(name))
    .filter((input): input is FieldSchema => Boolean(input));
}

export function resolveFormEnctype(inputs: FieldSchema[]): string {
  return inputs.some((input) => resolveFieldKind(input) === "asset") ? "multipart/form-data" : "application/x-www-form-urlencoded";
}

export function getFormKey(blockName: string, operation: { method: string; target: string; name?: string }): string {
  return `${blockName}:${operation.method}:${operation.target}:${operation.name ?? ""}`;
}

export function resolveInputDefaultValue(input: Pick<FieldSchema, "kind" | "options"> & Partial<Pick<FieldSchema, "defaultValue">>): string {
  const kind = resolveFieldKind(input);
  if (input.defaultValue !== undefined && input.defaultValue !== null) {
    return String(input.defaultValue);
  }
  if (kind === "enum") {
    return input.options?.[0] ?? "";
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
  return "";
}

export function getInputValue(
  input: Pick<FieldSchema, "kind" | "name" | "options"> & Partial<Pick<FieldSchema, "defaultValue">>,
  formValues: MdanSubmitValues
): string {
  const value = formValues[input.name];
  if (typeof value === "string") {
    return value;
  }
  return resolveInputDefaultValue(input);
}

export function buildOperationPayload(
  operation: Pick<MdanOperation, "inputs">,
  inputsByName: Map<string, FieldSchema>,
  formValues: MdanSubmitValues
): MdanSubmitValues {
  const payload: Record<string, unknown> = {};
  const payloadInputs: FieldSchema[] = [];
  for (const name of operation.inputs) {
    const input = inputsByName.get(name);
    const rawValue = formValues[name];
    if (rawValue instanceof File) {
      payload[name] = rawValue;
      if (input) {
        payloadInputs.push(input);
      }
      continue;
    }
    payload[name] = input ? getInputValue(input, formValues) : typeof rawValue === "string" ? rawValue : "";
    if (input) {
      payloadInputs.push(input);
    }
  }
  return normalizeInputValuesByFieldSchemas(payload, payloadInputs) as MdanSubmitValues;
}

export type DispatchAction =
  | {
      kind: "visit";
      target: string;
    }
  | {
      kind: "submit";
      operation: MdanOperation;
      payload: MdanSubmitValues;
    };

export function resolveDispatchAction(operation: MdanOperation, payload: MdanSubmitValues): DispatchAction {
  if (resolveDispatchMode(operation, payload) === "visit") {
    return {
      kind: "visit",
      target: operation.target
    };
  }
  return {
    kind: "submit",
    operation,
    payload
  };
}

export interface DispatchHost {
  submit(operation: MdanOperation, payload?: MdanSubmitValues): Promise<void>;
  visit(target: string): Promise<void>;
}

export async function dispatchOperation(
  host: DispatchHost,
  operation: MdanOperation,
  payload: MdanSubmitValues
): Promise<void> {
  const action = resolveDispatchAction(operation, payload);
  if (action.kind === "visit") {
    await host.visit(action.target);
    return;
  }
  await host.submit(action.operation, action.payload);
}

export interface ActionPresentation {
  variant: "primary" | "secondary" | "quiet" | "danger";
  behavior: "page" | "region" | "submit" | "read";
}

export function resolveActionPresentation(operation: MdanOperation): ActionPresentation {
  return {
    variant: resolveActionVariant(operation),
    behavior: resolveActionBehavior(operation)
  };
}

export interface ActionCapabilities {
  method: "GET" | "POST";
  target: string;
  hasInputs: boolean;
  acceptsStream: boolean;
  dispatchWhenEmptyPayload: "visit" | "submit";
  presentation: ActionPresentation;
  responseMode: "page" | "region" | "unknown";
  updatedRegions: string[];
}

function resolveResponseMode(operation: MdanOperation): "page" | "region" | "unknown" {
  const responseMode = operation.stateEffect?.responseMode;
  if (responseMode === "page" || responseMode === "region") {
    return responseMode;
  }
  return "unknown";
}

function resolveUpdatedRegions(operation: MdanOperation): string[] {
  const updatedRegions = operation.stateEffect?.updatedRegions;
  if (!Array.isArray(updatedRegions)) {
    return [];
  }
  return updatedRegions.filter((entry): entry is string => typeof entry === "string");
}

export function resolveActionCapabilities(operation: MdanOperation): ActionCapabilities {
  return {
    method: operation.method,
    target: operation.target,
    hasInputs: operation.inputs.length > 0,
    acceptsStream: operation.accept === "text/event-stream",
    dispatchWhenEmptyPayload: resolveDispatchMode(operation, {}),
    presentation: resolveActionPresentation(operation),
    responseMode: resolveResponseMode(operation),
    updatedRegions: resolveUpdatedRegions(operation)
  };
}

export interface InputCapabilities {
  control: "select" | "checkbox" | "file" | "textarea" | "input";
  inputType: "text" | "number" | "password" | null;
  valueChannel: "value" | "checked" | "file";
}

export function resolveInputCapabilities(input: Pick<FieldSchema, "kind" | "secret"> & Partial<Pick<FieldSchema, "format">>): InputCapabilities {
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
