import { mountMdanElements } from "@mdanai/sdk/elements";
import { createHeadlessHost } from "@mdanai/sdk/web";

export function mountGuestbook(root: HTMLElement | Document, fetchImpl: typeof fetch): void {
  const host = createHeadlessHost({ root, fetchImpl });
  mountMdanElements({ root, host }).mount();
}
