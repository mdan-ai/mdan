import { html, nothing, render } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import {
  basicMarkdownRenderer,
  buildOperationPayload,
  createInputsByName,
  dispatchOperation,
  getFormKey,
  getInputValue,
  humanizeInputLabel,
  type FieldSchema,
  type MdanMarkdownRenderer,
  type MdanSubmitValues,
  resolveActionCapabilities,
  resolveFormEnctype,
  resolveInputCapabilities,
  resolveRenderableInputs
} from "./model.js";
import type { HeadlessSnapshot, MdanHeadlessUiHost } from "../surface/protocol.js";

import { registerMdanUi } from "./register.js";

export interface MountMdanUiOptions {
  root: ParentNode;
  host: MdanHeadlessUiHost;
  markdownRenderer?: MdanMarkdownRenderer;
}

export interface MdanUiRuntime {
  mount(): void;
  unmount(): void;
  submit(operation: Parameters<MdanHeadlessUiHost["submit"]>[0], values?: MdanSubmitValues): Promise<void>;
  visit(target: string): Promise<void>;
  sync(target?: string): Promise<void>;
}

interface DebugMessageRecord {
  direction: string;
  method: string;
  url: string;
  markdown: string;
}

interface WindowWithMdanDebug extends Window {
  __MDAN_DEBUG__?: {
    messages: DebugMessageRecord[];
  };
}

function renderMarkdown(markdown: string, markdownRenderer: MdanMarkdownRenderer) {
  return unsafeHTML(markdownRenderer.render(markdown));
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
  const markdownRenderer = options.markdownRenderer ?? basicMarkdownRenderer;

  let unsubscribe: (() => void) | null = null;
  const valuesByForm: Record<string, MdanSubmitValues> = {};
  let debugDrawerOpen = false;
  let latestSnapshot: HeadlessSnapshot | null = null;
  let clearedInitialMarkup = false;

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
    operation: Parameters<MdanHeadlessUiHost["submit"]>[0],
    payload: MdanSubmitValues
  ): Promise<void> {
    await dispatchOperation(host, operation as any, payload);
  }

  function renderSnapshot(snapshot: HeadlessSnapshot): void {
    const debugMessages = getDebugMessages();

    const renderInputField = (
      formKey: string,
      formValues: MdanSubmitValues,
      input: FieldSchema
    ) => {
      const label = html`<span class="mdan-label-text">
        ${humanizeInputLabel(input.name, { titleCase: true })}
        ${input.required ? html`<span class="mdan-required" aria-hidden="true">*</span>` : ""}
      </span>`;
      const description =
        typeof input.description === "string" && input.description.trim().length > 0
          ? html`<small class="mdan-field-help">${input.description}</small>`
          : nothing;
      const inputCapabilities = resolveInputCapabilities(input);

      if (inputCapabilities.control === "select") {
        return html`
          <mdan-field>
            <label>
              ${label}
              <select
                name=${input.name}
                ?required=${input.required}
                .value=${getInputValue(input, formValues)}
                @change=${(event: Event) => {
                  onInput(formKey, input.name, (event.currentTarget as HTMLSelectElement).value);
                }}
              >
                ${(input.options ?? []).map((option) => html`<option value=${option}>${option}</option>`)}
              </select>
              ${description}
            </label>
          </mdan-field>
        `;
      }

      if (inputCapabilities.control === "checkbox") {
        return html`
          <mdan-field>
            <label>
              ${label}
              <input
                name=${input.name}
                type="checkbox"
                ?required=${input.required}
                .checked=${formValues[input.name] === "true"}
                @change=${(event: Event) => {
                  onInput(formKey, input.name, (event.currentTarget as HTMLInputElement).checked ? "true" : "false");
                }}
              >
              ${description}
            </label>
          </mdan-field>
        `;
      }

      if (inputCapabilities.control === "file") {
        return html`
          <mdan-field>
            <label>
              ${label}
              <input
                name=${input.name}
                type="file"
                ?required=${input.required}
                @change=${(event: Event) => {
                  const file = (event.currentTarget as HTMLInputElement).files?.[0];
                  onInput(formKey, input.name, file ?? "");
                }}
              >
              ${description}
            </label>
          </mdan-field>
        `;
      }

      if (inputCapabilities.control === "textarea") {
        return html`
          <mdan-field>
            <label>
              ${label}
              <textarea
                name=${input.name}
                ?required=${input.required}
                .value=${formValues[input.name] ?? ""}
                minlength=${input.constraints?.minLength ?? nothing}
                maxlength=${input.constraints?.maxLength ?? nothing}
                pattern=${input.constraints?.pattern ?? nothing}
                @input=${(event: Event) => {
                  onInput(formKey, input.name, (event.currentTarget as HTMLTextAreaElement).value);
                }}
              ></textarea>
              ${description}
            </label>
          </mdan-field>
        `;
      }

      return html`
        <mdan-field>
          <label>
            ${label}
            <input
              name=${input.name}
              type=${inputCapabilities.inputType ?? "text"}
              ?required=${input.required}
              .value=${formValues[input.name] ?? ""}
              min=${input.constraints?.minimum ?? nothing}
              max=${input.constraints?.maximum ?? nothing}
              minlength=${input.constraints?.minLength ?? nothing}
              maxlength=${input.constraints?.maxLength ?? nothing}
              pattern=${input.constraints?.pattern ?? nothing}
              @input=${(event: Event) => {
                onInput(formKey, input.name, (event.currentTarget as HTMLInputElement).value);
              }}
            >
            ${description}
          </label>
        </mdan-field>
      `;
    };

    const renderOperationForm = (
      blockName: string,
      operation: Parameters<MdanHeadlessUiHost["submit"]>[0],
      inputsByName: ReturnType<typeof createInputsByName>
    ) => {
      const formKey = getFormKey(blockName, operation);
      const formValues = getFormValues(formKey);
      const { presentation } = resolveActionCapabilities(operation as any);
      const { variant: actionVariant, behavior: actionBehavior } = presentation;
      const renderableInputs = resolveRenderableInputs(operation as any, inputsByName);

      return html`
        <mdan-form>
          <form
            data-mdan-action-variant=${actionVariant}
            data-mdan-action-behavior=${actionBehavior}
            enctype=${resolveFormEnctype(renderableInputs)}
            @submit=${(event: Event) => {
              event.preventDefault();
              const form = event.currentTarget as HTMLFormElement;
              if (typeof form.reportValidity === "function" && !form.reportValidity()) {
                return;
              }
              const payload = buildOperationPayload(operation as any, inputsByName, formValues);
              void executeOperation(operation, payload);
              if (operation.method === "POST") {
                valuesByForm[formKey] = {};
              }
            }}
          >
            ${renderableInputs.map((input) => renderInputField(formKey, formValues, input))}
            <mdan-action>
              <button
                type="submit"
                data-mdan-action-variant=${actionVariant}
                data-mdan-action-behavior=${actionBehavior}
              >
                ${operation.label ?? operation.name ?? operation.target}
              </button>
            </mdan-action>
          </form>
        </mdan-form>
      `;
    };

    render(
      html`
        <mdan-page>
          ${snapshot.status === "error" && snapshot.error
            ? html`<mdan-error>${snapshot.error}</mdan-error>`
            : nothing}
          ${snapshot.markdown ? renderMarkdown(snapshot.markdown, markdownRenderer) : ""}
          ${snapshot.blocks.map((block) => {
            const inputsByName = createInputsByName(block.inputs);

            return html`
              <mdan-block data-mdan-block=${block.name}>
                ${block.markdown ? renderMarkdown(block.markdown, markdownRenderer) : ""}
                ${block.operations.map((operation) => renderOperationForm(block.name, operation, inputsByName))}
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
                                </div>
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
      if (!clearedInitialMarkup && container instanceof HTMLElement && container.hasAttribute("data-mdan-browser-shell")) {
        container.replaceChildren();
        clearedInitialMarkup = true;
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
