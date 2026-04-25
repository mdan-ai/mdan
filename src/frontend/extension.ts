import { defaultUiFormRenderer, type UiFormRenderer } from "./form-renderer.js";
import { basicMarkdownRenderer, type MdanMarkdownRenderer } from "./model.js";

export interface MdanFrontendExtension {
  markdown?: MdanMarkdownRenderer;
  form?: UiFormRenderer;
}

export interface ResolveFrontendExtensionOptions {
  frontend?: MdanFrontendExtension;
  markdownRenderer?: MdanMarkdownRenderer;
  formRenderer?: UiFormRenderer;
}

export interface ResolvedFrontendExtension {
  markdown: MdanMarkdownRenderer;
  form: UiFormRenderer;
}

export function defineFrontend(extension: MdanFrontendExtension): MdanFrontendExtension {
  return extension;
}

export function resolveFrontendExtension(
  options: ResolveFrontendExtensionOptions = {}
): ResolvedFrontendExtension {
  return {
    markdown: options.frontend?.markdown ?? options.markdownRenderer ?? basicMarkdownRenderer,
    form: options.frontend?.form ?? options.formRenderer ?? defaultUiFormRenderer
  };
}
