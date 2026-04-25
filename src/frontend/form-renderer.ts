import { html, nothing } from "lit";

import {
  defaultUiFormRenderer,
  type MountedOperationRenderOptions,
  type UiFormRenderer
} from "./ui-form-renderer.js";

const formRendererDefinitionSymbol = Symbol.for("mdan.formRenderer.definition");

export interface DefinedUiFormRenderer extends UiFormRenderer {
  [formRendererDefinitionSymbol]: {
    exportName: string;
    moduleUrl: string;
  };
}

export function defineFormRenderer(
  moduleUrl: string,
  exportName: string,
  renderer: UiFormRenderer
): DefinedUiFormRenderer {
  return Object.assign(renderer, {
    [formRendererDefinitionSymbol]: {
      exportName,
      moduleUrl
    }
  });
}

export function getDefinedFormRendererDefinition(
  renderer: UiFormRenderer | undefined
): DefinedUiFormRenderer[typeof formRendererDefinitionSymbol] | null {
  if (!renderer || typeof renderer !== "object") {
    return null;
  }
  const definition = (renderer as DefinedUiFormRenderer)[formRendererDefinitionSymbol];
  if (!definition || typeof definition.moduleUrl !== "string" || typeof definition.exportName !== "string") {
    return null;
  }
  return definition;
}

export { defaultUiFormRenderer, html, nothing, type MountedOperationRenderOptions, type UiFormRenderer };
