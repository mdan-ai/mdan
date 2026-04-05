import { mountMdanElements } from "@mdanai/sdk/elements";
import { createHeadlessHost } from "@mdanai/sdk/web";

export function mountExpressStarter(root: HTMLElement, fetchImpl: typeof fetch): void {
  const host = createHeadlessHost({ root, fetchImpl });
  mountMdanElements({ root, host }).mount();
}
