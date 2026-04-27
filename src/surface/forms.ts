import {
  resolveDispatchAction,
  type MdanOperation,
  type MdanSubmitValues
} from "../core/surface/forms.js";

export {
  buildGetActionUrl,
  buildOperationPayload,
  createInputsByName,
  getInputValue,
  groupOperations,
  resolveDispatchAction,
  resolveFormEnctype,
  resolveInputDefaultValue,
  resolveRenderableInputs,
  shouldOmitEmptyInput,
  type DispatchAction,
  type OperationGroups
} from "../core/surface/forms.js";

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
