import { html, nothing, render } from "lit";

import { toGetUrl } from "../surface/transport.js";

import type { FrontendHost, FrontendSnapshot, FrontendUiHost } from "./contracts.js";
import type { MdanUiRuntime } from "./mount.js";
import {
  resolveUiSnapshotView,
  submitUiOperation,
  type UiOperationView
} from "./model.js";
import type { MdanSubmitValues } from "./contracts.js";
import { resolveFrontendExtension, type MdanFrontendExtension } from "./extension.js";

export interface HtmlDocumentNavigationOptions {
  host: FrontendHost;
  currentRoute: string;
  navigateDocument: (target: string) => void;
}

export interface MountHtmlActionLayerOptions {
  root: ParentNode;
  host: FrontendUiHost;
  frontend?: MdanFrontendExtension;
}

function isDocumentNode(root: ParentNode): root is Document {
  return root.nodeType === Node.DOCUMENT_NODE;
}

function ensureContainer(root: ParentNode): HTMLElement {
  if (isDocumentNode(root)) {
    const existing = root.querySelector("[data-mdan-ui-root]");
    if (existing instanceof HTMLElement) {
      return existing;
    }
    const host = root.createElement("div");
    host.setAttribute("data-mdan-ui-root", "");
    root.body.append(host);
    return host;
  }
  const host = root as HTMLElement;
  host.setAttribute("data-mdan-ui-root", "");
  return host;
}

function ensureFallbackActionContainer(container: HTMLElement): HTMLElement {
  const existing = container.querySelector("[data-mdan-action-root]:not([data-mdan-block])");
  if (existing instanceof HTMLElement) {
    return existing;
  }
  const host = container.ownerDocument.createElement("div");
  host.setAttribute("data-mdan-action-root", "");
  container.append(host);
  return host;
}

function findBlockActionContainer(container: HTMLElement, blockName: string): HTMLElement | null {
  const candidates = container.querySelectorAll("[data-mdan-action-root][data-mdan-block]");
  for (const candidate of candidates) {
    if (candidate instanceof HTMLElement && candidate.getAttribute("data-mdan-block") === blockName) {
      return candidate;
    }
  }
  return null;
}

function shouldNavigateDocumentForOperation(operation: { method: string; stateEffect?: { responseMode?: string } }): boolean {
  return operation.method === "GET" && operation.stateEffect?.responseMode !== "region";
}

export function withHtmlDocumentNavigation(options: HtmlDocumentNavigationOptions): FrontendHost {
  const { host, currentRoute, navigateDocument } = options;
  return {
    ...host,
    async visit(target: string) {
      navigateDocument(target);
    },
    async sync(target?: string) {
      navigateDocument(target ?? currentRoute);
    },
    async submit(operation, values = {}) {
      if (shouldNavigateDocumentForOperation(operation)) {
        navigateDocument(toGetUrl(operation.target, operation, values));
        return;
      }
      await host.submit(operation, values);
    }
  };
}

export function mountHtmlActionLayer(options: MountHtmlActionLayerOptions): MdanUiRuntime {
  const container = ensureContainer(options.root);
  const fallbackContainer = ensureFallbackActionContainer(container);
  const formRenderer = resolveFrontendExtension(options).form;
  const host = options.host;

  let unsubscribe: (() => void) | null = null;
  const valuesByForm: Record<string, MdanSubmitValues> = {};

  function getFormValues(formKey: string): MdanSubmitValues {
    valuesByForm[formKey] ??= {};
    return valuesByForm[formKey]!;
  }

  function onInput(formKey: string, name: string, value: string | File): void {
    getFormValues(formKey)[name] = value;
  }

  async function executeOperation(operation: UiOperationView): Promise<void> {
    await submitUiOperation(host, operation, getFormValues(operation.formKey));
  }

  function renderActionBlock(block: ReturnType<typeof resolveUiSnapshotView>["blocks"][number]) {
    return html`
      <mdan-block data-mdan-block=${block.name}>
        ${block.operations.map((operation) =>
          formRenderer.renderMountedOperation({
            operation,
            onInput,
            onSubmit: (submittedOperation) => {
              void executeOperation(submittedOperation);
              if (submittedOperation.method === "POST") {
                valuesByForm[submittedOperation.formKey] = {};
              }
            }
          })
        )}
      </mdan-block>
    `;
  }

  function renderSnapshot(snapshot: FrontendSnapshot): void {
    const view = resolveUiSnapshotView(snapshot, getFormValues);
    const fallbackBlocks = [];

    for (const block of view.blocks) {
      const target = findBlockActionContainer(container, block.name);
      const blockTemplate = renderActionBlock(block);
      if (target) {
        render(blockTemplate, target);
      } else {
        fallbackBlocks.push(blockTemplate);
      }
    }

    render(
      html`
        ${view.status === "error" && view.error
          ? html`<mdan-error>${view.error}</mdan-error>`
          : nothing}
        ${fallbackBlocks}
      `,
      fallbackContainer
    );
  }

  return {
    mount(): void {
      unsubscribe = host.subscribe(renderSnapshot);
      host.mount?.();
    },
    unmount(): void {
      unsubscribe?.();
      unsubscribe = null;
      host.unmount?.();
      render(html``, fallbackContainer);
    },
    submit(operation, valuesMap) {
      return host.submit(operation, valuesMap);
    },
    visit(target) {
      return host.visit(target);
    },
    sync(target) {
      return host.sync(target);
    }
  };
}
