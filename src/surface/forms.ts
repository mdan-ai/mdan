import {
  normalizeInputValuesByFieldSchemas,
  resolveDispatchMode,
  resolveFieldKind,
  type FieldSchema,
  type MdanOperation,
  type MdanSubmitValues
} from "./presentation.js";

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

export function resolveInputDefaultValue(
  input: Pick<FieldSchema, "kind" | "options" | "required"> & Partial<Pick<FieldSchema, "defaultValue">>,
  method: "GET" | "POST" = "POST"
): string {
  const kind = resolveFieldKind(input);
  if (method === "GET" && !input.required) {
    if (kind === "boolean") {
      return input.defaultValue === true ? "true" : "";
    }
    return "";
  }
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
  input: Pick<FieldSchema, "kind" | "name" | "options" | "required"> & Partial<Pick<FieldSchema, "defaultValue">>,
  formValues: MdanSubmitValues,
  method: "GET" | "POST" = "POST"
): string {
  const value = formValues[input.name];
  if (typeof value === "string") {
    return value;
  }
  return resolveInputDefaultValue(input, method);
}

export function shouldOmitEmptyInput(
  input: Pick<FieldSchema, "required">,
  method: "GET" | "POST"
): boolean {
  return method === "GET" && !input.required;
}

export function buildOperationPayload(
  operation: Pick<MdanOperation, "inputs" | "method">,
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
    const value = input
      ? getInputValue(input, formValues, operation.method)
      : typeof rawValue === "string" ? rawValue : "";
    if (operation.method === "GET" && input && shouldOmitEmptyInput(input, operation.method) && value === "") {
      continue;
    }
    payload[name] = value;
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
