import { mountMdsnElements } from "@mdsn/elements";
import { createHeadlessHost } from "@mdsn/web";

export function mountExpressStarter(root: HTMLElement, fetchImpl: typeof fetch): void {
  const host = createHeadlessHost({ root, fetchImpl });
  mountMdsnElements({ root, host }).mount();
}
