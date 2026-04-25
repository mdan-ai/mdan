import { html, nothing, render } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import {
  type FrontendSnapshot,
  type FrontendUiHost,
  type MdanMarkdownRenderer,
  type MdanSubmitValues,
  resolveUiSnapshotView,
  submitUiOperation,
  type UiOperationView
} from "./model.js";
import type { UiFormRenderer } from "./form-renderer.js";
import { resolveFrontendExtension, type MdanFrontendExtension } from "./extension.js";

import { registerMdanUi } from "./register.js";

export interface MountMdanUiOptions {
  root: ParentNode;
  host: FrontendUiHost;
  frontend?: MdanFrontendExtension;
  markdownRenderer?: MdanMarkdownRenderer;
  formRenderer?: UiFormRenderer;
}

export interface MdanUiRuntime {
  mount(): void;
  unmount(): void;
  submit(operation: Parameters<FrontendUiHost["submit"]>[0], values?: MdanSubmitValues): Promise<void>;
  visit(target: string): Promise<void>;
  sync(target?: string): Promise<void>;
}

interface DebugMessageRecord {
  direction: string;
  method: string;
  url: string;
  markdown: string;
  transition?: string;
  updatedRegions?: string[];
  patchApplied?: boolean;
  fallbackTransition?: string;
  patchFallbackReason?: string;
  requestedRoute?: string;
  resolvedRoute?: string;
}

interface WindowWithMdanDebug extends Window {
  __MDAN_DEBUG__?: {
    messages: DebugMessageRecord[];
  };
}

function renderMarkdown(
  markdown: string,
  markdownRenderer: MdanMarkdownRenderer,
  context: Parameters<MdanMarkdownRenderer["render"]>[1]
) {
  return unsafeHTML(markdownRenderer.render(markdown, context));
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

function ensureGlobalStyle(document: Document): void {
  if (document.getElementById("mdan-ui-headless-style")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "mdan-ui-headless-style";
  style.textContent = `
    [data-mdan-ui-root] {
      display: block;
    }
  `;
  document.head.append(style);
}

function getDocument(root: ParentNode): Document {
  return isDocumentNode(root) ? root : root.ownerDocument ?? document;
}

export function mountMdanUi(options: MountMdanUiOptions): MdanUiRuntime {
  registerMdanUi();

  const document = getDocument(options.root);
  const container = ensureContainer(options.root);
  ensureGlobalStyle(document);
  const host = options.host;
  const frontend = resolveFrontendExtension(options);
  const markdownRenderer = frontend.markdown;
  const formRenderer = frontend.form;

  let unsubscribe: (() => void) | null = null;
  const valuesByForm: Record<string, MdanSubmitValues> = {};
  let debugDrawerOpen = false;
  let latestSnapshot: FrontendSnapshot | null = null;

  function getDebugMessages(): DebugMessageRecord[] {
    if (typeof window === "undefined") {
      return [];
    }
    const debugWindow = window as WindowWithMdanDebug;
    return debugWindow.__MDAN_DEBUG__?.messages ?? [];
  }

  function clearDebugMessages(): void {
    if (typeof window === "undefined") {
      return;
    }
    const debugWindow = window as WindowWithMdanDebug;
    if (debugWindow.__MDAN_DEBUG__) {
      debugWindow.__MDAN_DEBUG__.messages = [];
    }
  }

  function getFormValues(formKey: string): MdanSubmitValues {
    valuesByForm[formKey] ??= {};
    return valuesByForm[formKey]!;
  }

  function onInput(formKey: string, name: string, value: string | File): void {
    getFormValues(formKey)[name] = value;
  }

  async function executeOperation(
    operation: UiOperationView
  ): Promise<void> {
    await submitUiOperation(host, operation, getFormValues(operation.formKey));
  }

  function renderSnapshot(snapshot: FrontendSnapshot): void {
    const debugMessages = getDebugMessages();

    const view = resolveUiSnapshotView(snapshot, getFormValues);

    render(
      html`
        <mdan-page>
          ${view.status === "error" && view.error
            ? html`<mdan-error>${view.error}</mdan-error>`
            : nothing}
          ${view.markdown ? renderMarkdown(view.markdown, markdownRenderer, { kind: "page", route: view.route }) : ""}
          ${view.blocks.map((block) => {
            return html`
              <mdan-block data-mdan-block=${block.name}>
                ${block.markdown
                  ? renderMarkdown(block.markdown, markdownRenderer, { kind: "block", blockName: block.name })
                  : ""}
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
          })}
        </mdan-page>
        ${debugMessages.length > 0
          ? html`
              <aside
                data-mdan-debug-panel
                style="position:fixed;right:1rem;bottom:1rem;z-index:9999;display:grid;gap:0.75rem;max-width:min(28rem,calc(100vw - 2rem));font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;"
              >
                <button
                  type="button"
                  data-mdan-debug-toggle
                  style="justify-self:end;border:1px solid #cbd5e1;background:#0f172a;color:#f8fafc;border-radius:999px;padding:0.6rem 0.9rem;box-shadow:0 10px 30px rgba(15,23,42,0.2);cursor:pointer;"
                  @click=${() => {
                    debugDrawerOpen = !debugDrawerOpen;
                    if (latestSnapshot) {
                      renderSnapshot(latestSnapshot);
                    }
                  }}
                >
                  Debug ${debugMessages.length}
                </button>
                ${debugDrawerOpen
                  ? html`
                      <section
                        data-mdan-debug-drawer
                        style="background:#020617;color:#e2e8f0;border:1px solid #1e293b;border-radius:1rem;padding:0.9rem;box-shadow:0 16px 40px rgba(15,23,42,0.35);max-height:min(32rem,70vh);overflow:auto;"
                      >
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;margin-bottom:0.75rem;">
                          <strong style="font-size:12px;letter-spacing:0.04em;text-transform:uppercase;">MDAN Debug</strong>
                          <button
                            type="button"
                            style="border:1px solid #334155;background:transparent;color:#cbd5e1;border-radius:999px;padding:0.35rem 0.7rem;cursor:pointer;"
                            @click=${() => {
                              clearDebugMessages();
                              if (latestSnapshot) {
                                renderSnapshot(latestSnapshot);
                              }
                            }}
                          >
                            Clear
                          </button>
                        </div>
                        <div style="display:grid;gap:0.75rem;">
                          ${[...debugMessages].reverse().map(
                            (message) => html`
                              <article style="border:1px solid #1e293b;border-radius:0.75rem;padding:0.75rem;background:#0f172a;">
                                <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.5rem;color:#93c5fd;">
                                  <span>${message.direction}</span>
                                  <span>${message.method}</span>
                                  <span>${message.url}</span>
                                  ${message.transition ? html`<span>transition:${message.transition}</span>` : null}
                                  ${message.patchApplied !== undefined ? html`<span>patch:${String(message.patchApplied)}</span>` : null}
                                  ${message.fallbackTransition ? html`<span>fallback:${message.fallbackTransition}</span>` : null}
                                </div>
                                ${(message.updatedRegions?.length ?? 0) > 0 || message.patchFallbackReason || message.requestedRoute || message.resolvedRoute
                                  ? html`
                                      <div style="display:grid;gap:0.2rem;margin-bottom:0.5rem;color:#cbd5e1;">
                                        ${message.updatedRegions?.length ? html`<div>updatedRegions: ${message.updatedRegions.join(", ")}</div>` : null}
                                        ${message.patchFallbackReason ? html`<div>patchFallbackReason: ${message.patchFallbackReason}</div>` : null}
                                        ${message.requestedRoute ? html`<div>requestedRoute: ${message.requestedRoute}</div>` : null}
                                        ${message.resolvedRoute ? html`<div>resolvedRoute: ${message.resolvedRoute}</div>` : null}
                                      </div>
                                    `
                                  : null}
                                <pre style="margin:0;white-space:pre-wrap;word-break:break-word;color:#e2e8f0;">${message.markdown}</pre>
                              </article>
                            `
                          )}
                        </div>
                      </section>
                    `
                  : null}
              </aside>
            `
          : null}
      `,
      container
    );
  }

  return {
    mount(): void {
      if (container instanceof HTMLElement) {
        container.replaceChildren();
      }
      unsubscribe = host.subscribe((snapshot) => {
        latestSnapshot = snapshot;
        renderSnapshot(snapshot);
      });
      host.mount?.();
    },
    unmount(): void {
      unsubscribe?.();
      unsubscribe = null;
      host.unmount?.();
      render(html``, container);
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
