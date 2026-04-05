import { mountMdanElements } from "@mdanai/sdk/elements";
import { createHeadlessHost } from "@mdanai/sdk/web";

export function mountAuthSessionExample(root: HTMLElement | Document, fetchImpl: typeof fetch): void {
  const host = createHeadlessHost({ root, fetchImpl });
  mountMdanElements({ root, host }).mount();
}
