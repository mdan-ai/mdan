import type { NormalizedAction } from "./models.js";
import { projectInputSchema } from "./project-schema.js";

export interface ProjectActionManifestOptions {
  appId: string;
  stateId: string;
  stateVersion: number;
  blockNames: string[];
  actions: NormalizedAction[];
}

export function projectActionManifest(options: ProjectActionManifestOptions) {
  return {
    app_id: options.appId,
    state_id: options.stateId,
    state_version: options.stateVersion,
    response_mode: "page" as const,
    blocks: options.blockNames,
    actions: options.actions.map((action) => ({
      id: action.id,
      label: action.label,
      verb: action.verb,
      transport: {
        method: action.method
      },
      target: action.path,
      input_schema: projectInputSchema(action.input)
    })),
    allowed_next_actions: options.actions.map((action) => action.id)
  };
}

