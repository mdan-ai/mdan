import {
  type MdanMarkdownRenderer,
  type UiSnapshotView
} from "./model.js";
import type { UiFormRenderer } from "./form-renderer.js";
import { resolveFrontendExtension, type MdanFrontendExtension } from "./extension.js";

export interface RenderSurfaceSnapshotOptions {
  frontend?: MdanFrontendExtension;
  markdownRenderer?: MdanMarkdownRenderer;
  formRenderer?: UiFormRenderer;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderSurfaceSnapshot(
  view: UiSnapshotView | undefined,
  options: RenderSurfaceSnapshotOptions = {}
): string {
  if (!view) {
    return "";
  }

  const frontend = resolveFrontendExtension(options);
  const markdownRenderer = frontend.markdown;
  const formRenderer = frontend.form;
  const pageHtml = markdownRenderer.render(view.markdown, {
    kind: "page",
    route: view.route
  });
  const blocks = view.blocks
    .map((block) => {
      const markdown = block.markdown
        ? markdownRenderer.render(block.markdown, {
            kind: "block",
            blockName: block.name
          })
        : "";
      const operations = block.operations.map((operation) => formRenderer.renderSnapshotOperation(operation)).join("");
      return `<mdan-block data-mdan-block="${escapeHtml(block.name)}">${markdown}${operations}</mdan-block>`;
    })
    .join("\n");
  return `<mdan-page>${[pageHtml, blocks].filter(Boolean).join("\n")}</mdan-page>`;
}
