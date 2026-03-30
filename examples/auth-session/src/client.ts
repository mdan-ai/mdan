import { mountMdsnElements } from "@mdsn/elements";
import { createHeadlessHost } from "@mdsn/web";

export function mountAuthSessionExample(root: HTMLElement | Document, fetchImpl: typeof fetch): void {
  const host = createHeadlessHost({ root, fetchImpl });
  mountMdsnElements({ root, host }).mount();
}
