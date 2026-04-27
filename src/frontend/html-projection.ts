import { html, nothing, render } from "lit";

import { buildGetActionUrl } from "../core/surface/forms.js";

import type { FrontendHost, FrontendSnapshot, FrontendUiHost } from "./contracts.js";
import type { MdanUiRuntime } from "./mount.js";
import {
  resolveUiSnapshotView,
  submitUiOperation,
  type UiOperationView
} from "./model.js";
import type { MdanSubmitValues } from "./contracts.js";
import {
  attachFrontendSetup,
  getFrontendSetupRoute,
  resolveFrontendExtension,
  type MdanFrontendExtension
} from "./extension.js";
import { registerMdanUi } from "./register.js";

export interface HtmlDocumentNavigationOptions {
  host: FrontendHost;
  currentRoute: string;
  navigateDocument: (target: string) => void;
}

export interface MountHtmlActionLayerOptions {
  root: ParentNode;
  host: FrontendUiHost;
  route?: string;
  browserProjection?: "html";
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

function findBlockContentContainer(container: HTMLElement, blockName: string): HTMLElement | null {
  const candidates = container.querySelectorAll("[data-mdan-block]");
  for (const candidate of candidates) {
    if (
      candidate instanceof HTMLElement &&
      candidate.getAttribute("data-mdan-block") === blockName &&
      !candidate.hasAttribute("data-mdan-action-root")
    ) {
      return candidate;
    }
  }
  return null;
}

function createBlockActionContainer(container: HTMLElement, blockName: string): HTMLElement {
  const host = container.ownerDocument.createElement("div");
  host.setAttribute("data-mdan-action-root", "");
  host.setAttribute("data-mdan-block", blockName);
  return host;
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
        navigateDocument(buildGetActionUrl(operation.target, operation, values));
        return;
      }
      await host.submit(operation, values);
    }
  };
}

export function mountHtmlActionLayer(options: MountHtmlActionLayerOptions): MdanUiRuntime {
  registerMdanUi();

  const container = ensureContainer(options.root);
  const fallbackContainer = ensureFallbackActionContainer(container);
  const frontend = resolveFrontendExtension(options);
  const formRenderer = frontend.form;
  const markdownRenderer = frontend.markdown;
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

  function patchRegionBlockContent(block: ReturnType<typeof resolveUiSnapshotView>["blocks"][number]): HTMLElement | null {
    const blockContainer = findBlockContentContainer(container, block.name);
    if (!blockContainer) {
      return null;
    }

    const renderedMarkdown = blockContainer.ownerDocument.createElement("div");
    renderedMarkdown.innerHTML = markdownRenderer.render(block.markdown, { kind: "block", blockName: block.name });

    const actionContainer = createBlockActionContainer(blockContainer, block.name);
    blockContainer.replaceChildren(...Array.from(renderedMarkdown.childNodes), actionContainer);
    return actionContainer;
  }

  function renderSnapshot(snapshot: FrontendSnapshot): void {
    const view = resolveUiSnapshotView(snapshot, getFormValues);
    const fallbackBlocks = [];

    for (const block of view.blocks) {
      const regionTarget = snapshot.transition === "region" ? patchRegionBlockContent(block) : null;
      const target = regionTarget ?? findBlockActionContainer(container, block.name);
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

function getDocument(root: ParentNode): Document {
  return isDocumentNode(root) ? root : root.ownerDocument ?? document;
}

export function mountHtmlProjectionRuntime(options: MountHtmlActionLayerOptions): MdanUiRuntime {
  const frontend = resolveFrontendExtension(options);
  const route = options.route ?? getFrontendSetupRoute(options.host);
  const document = getDocument(options.root);
  const setupContext = {
    host: options.host,
    root: options.root,
    ...(route !== undefined ? { route } : {}),
    browserProjection: "html" as const,
    ...(document.defaultView ? { window: document.defaultView } : {})
  };

  return attachFrontendSetup(
    mountHtmlActionLayer({
      ...options,
      frontend
    }),
    frontend,
    setupContext
  );
}
