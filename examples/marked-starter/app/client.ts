import { mountMdanElements } from "@mdanai/sdk/elements";
import { createHeadlessHost } from "@mdanai/sdk/web";
import { marked } from "marked";

const markdownRenderer = {
  render(markdown: string): string {
    return marked.parse(markdown) as string;
  }
};

export function mountApp(root: HTMLElement, fetchImpl: typeof fetch): void {
  const host = createHeadlessHost({ root, fetchImpl });
  mountMdanElements({ root, host, markdownRenderer }).mount();
}
