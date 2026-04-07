import { validatePage } from "../validate.js";
import type { MdanPage } from "../types.js";

export function validatePageV2(page: MdanPage): MdanPage {
  return validatePage(page);
}
