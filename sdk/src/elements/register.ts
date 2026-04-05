import { MdanActionElement } from "./components/mdan-action.js";
import { MdanBlockElement } from "./components/mdan-block.js";
import { MdanErrorElement } from "./components/mdan-error.js";
import { MdanFieldElement } from "./components/mdan-field.js";
import { MdanFormElement } from "./components/mdan-form.js";
import { MdanPageElement } from "./components/mdan-page.js";

export function registerMdanElements(): void {
  if (!customElements.get("mdan-page")) {
    customElements.define("mdan-page", MdanPageElement);
  }
  if (!customElements.get("mdan-block")) {
    customElements.define("mdan-block", MdanBlockElement);
  }
  if (!customElements.get("mdan-form")) {
    customElements.define("mdan-form", MdanFormElement);
  }
  if (!customElements.get("mdan-field")) {
    customElements.define("mdan-field", MdanFieldElement);
  }
  if (!customElements.get("mdan-action")) {
    customElements.define("mdan-action", MdanActionElement);
  }
  if (!customElements.get("mdan-error")) {
    customElements.define("mdan-error", MdanErrorElement);
  }
}
