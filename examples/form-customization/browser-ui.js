import { mountMdanUi as baseMountMdanUi } from "/__mdan/ui.js";
import { weatherFormRenderer } from "/form-renderer.js";

export function mountMdanUi(options) {
  return baseMountMdanUi({
    ...options,
    formRenderer: weatherFormRenderer
  });
}
