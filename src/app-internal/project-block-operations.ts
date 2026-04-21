import type { MdanOperation } from "../protocol/types.js";
import type { NormalizedAction } from "./models.js";
import { projectInputSchema } from "./project-schema.js";

export function projectBlockOperations(actions: NormalizedAction[]): MdanOperation[] {
  return actions.map((action) => ({
    method: action.method,
    name: action.id,
    target: action.path,
    inputs: Object.keys(action.input),
    label: action.label,
    verb: action.verb,
    stateEffect: {
      responseMode: "page"
    },
    security: {
      confirmationPolicy: "never"
    },
    inputSchema: projectInputSchema(action.input)
  })) as MdanOperation[];
}

