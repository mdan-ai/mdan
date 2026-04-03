import { basicMarkdownRenderer, type MdsnMarkdownRenderer } from "../core/index.js";
import { type MdsnHeadlessHost, type HeadlessSnapshot } from "../web/index.js";
import { html, render } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import { registerMdsnElements } from "./register.js";

export interface MountMdsnElementsOptions {
  root: ParentNode;
  host: MdsnHeadlessHost;
  markdownRenderer?: MdsnMarkdownRenderer;
}

export interface MdsnElementsRuntime extends MdsnHeadlessHost {}

interface DebugMessageRecord {
  direction: string;
  method: string;
  url: string;
  markdown: string;
}

interface WindowWithMdsnDebug extends Window {
  __MDSN_DEBUG__?: {
    messages: DebugMessageRecord[];
  };
}

function humanizeLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function renderMarkdown(markdown: string, markdownRenderer: MdsnMarkdownRenderer) {
  return unsafeHTML(markdownRenderer.render(markdown));
}

function ensureContainer(root: ParentNode): HTMLElement {
  if (root instanceof Document) {
    const existing = root.querySelector("[data-mdsn-elements-root]");
    if (existing instanceof HTMLElement) {
      return existing;
    }
    const host = root.createElement("div");
    host.setAttribute("data-mdsn-elements-root", "");
    root.body.append(host);
    return host;
  }
  return root as HTMLElement;
}

function ensureGlobalStyle(document: Document): void {
  if (document.getElementById("mdsn-elements-headless-style")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "mdsn-elements-headless-style";
  style.textContent = `
    mdsn-page {
      display: none !important;
    }
    [data-mdsn-elements-root] {
      display: block;
    }
  `;
  document.head.append(style);
}

function getDocument(root: ParentNode): Document {
  return root instanceof Document ? root : root.ownerDocument ?? document;
}

export function mountMdsnElements(options: MountMdsnElementsOptions): MdsnElementsRuntime {
  registerMdsnElements();

  const document = getDocument(options.root);
  const container = ensureContainer(options.root);
  ensureGlobalStyle(document);
  const host = options.host;
  const markdownRenderer = options.markdownRenderer ?? basicMarkdownRenderer;

  let unsubscribe: (() => void) | null = null;
  const valuesByForm: Record<string, Record<string, string>> = {};
  let debugDrawerOpen = false;

  function getDebugMessages(): DebugMessageRecord[] {
    if (typeof window === "undefined") {
      return [];
    }
    const debugWindow = window as WindowWithMdsnDebug;
    return debugWindow.__MDSN_DEBUG__?.messages ?? [];
  }

  function clearDebugMessages(): void {
    if (typeof window === "undefined") {
      return;
    }
    const debugWindow = window as WindowWithMdsnDebug;
    if (debugWindow.__MDSN_DEBUG__) {
      debugWindow.__MDSN_DEBUG__.messages = [];
    }
  }

  function getFormKey(blockName: string, operation: { method: string; target: string; name?: string }): string {
    return `${blockName}:${operation.method}:${operation.target}:${operation.name ?? ""}`;
  }

  function getFormValues(formKey: string): Record<string, string> {
    valuesByForm[formKey] ??= {};
    return valuesByForm[formKey]!;
  }

  function onInput(formKey: string, name: string, value: string): void {
    getFormValues(formKey)[name] = value;
  }

  function getInputValue(input: { type: string; name: string; options?: string[] }, formValues: Record<string, string>): string {
    const value = formValues[input.name];
    if (value !== undefined) {
      return value;
    }
    if (input.type === "choice") {
      return input.options?.[0] ?? "";
    }
    if (input.type === "boolean") {
      return "false";
    }
    return "";
  }

  function renderSnapshot(snapshot: HeadlessSnapshot): void {
    const debugMessages = getDebugMessages();
    render(
      html`
        <mdsn-page>
          ${snapshot.markdown ? renderMarkdown(snapshot.markdown, markdownRenderer) : ""}
          ${snapshot.blocks.map((block) => {
            const getOperations = [];
            const postOperations = [];
            for (const operation of block.operations) {
              if (operation.method === "GET") {
                getOperations.push(operation);
              } else {
                postOperations.push(operation);
              }
            }
            const inputsByName = new Map(block.inputs.map((input) => [input.name, input]));

            return html`
              <mdsn-block data-mdsn-block=${block.name}>
                ${block.markdown ? renderMarkdown(block.markdown, markdownRenderer) : ""}

                ${getOperations.map((operation) => {
                  const formKey = getFormKey(block.name, operation);
                  const formValues = getFormValues(formKey);
                  const renderableInputs = operation.inputs
                    .map((name) => inputsByName.get(name))
                    .filter((input): input is NonNullable<typeof input> => Boolean(input));

                  if (renderableInputs.length === 0) {
                    return html`
                      <div class="mdsn-elements-actions">
                        <mdsn-action>
                          <button
                            type="button"
                            @click=${() => {
                              void host.submit(operation, {});
                            }}
                          >
                            ${operation.label ?? operation.name ?? operation.target}
                          </button>
                        </mdsn-action>
                      </div>
                    `;
                  }

                  return html`
                    <mdsn-form>
                      <form
                        @submit=${(event: Event) => {
                          event.preventDefault();
                          const form = event.currentTarget as HTMLFormElement;
                          if (typeof form.reportValidity === "function" && !form.reportValidity()) {
                            return;
                          }
                          const payload: Record<string, string> = {};
                          for (const name of operation.inputs) {
                            const input = inputsByName.get(name);
                            payload[name] = input ? getInputValue(input, formValues) : formValues[name] ?? "";
                          }
                          void host.submit(operation, payload);
                        }}
                      >
                        ${renderableInputs.map((input) => {
                          const label = html`<span class="mdsn-label-text">
                            ${humanizeLabel(input.name)}
                            ${input.required ? html`<span class="mdsn-required" aria-hidden="true">*</span>` : ""}
                          </span>`;

                          if (input.type === "choice") {
                            return html`
                              <mdsn-field>
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
                                    ${(input.options ?? []).map(
                                      (option) => html`<option value=${option}>${option}</option>`
                                    )}
                                  </select>
                                </label>
                              </mdsn-field>
                            `;
                          }

                          if (input.type === "boolean") {
                            return html`
                              <mdsn-field>
                                <label>
                                  ${label}
                                  <input
                                    name=${input.name}
                                    type="checkbox"
                                    ?required=${input.required}
                                    .checked=${formValues[input.name] === "true"}
                                    @change=${(event: Event) => {
                                      onInput(
                                        formKey,
                                        input.name,
                                        (event.currentTarget as HTMLInputElement).checked ? "true" : "false"
                                      );
                                    }}
                                  >
                                </label>
                              </mdsn-field>
                            `;
                          }

                          if (input.type === "asset") {
                            return html`
                              <mdsn-field>
                                <label>
                                  ${label}
                                  <input
                                    name=${input.name}
                                    type="file"
                                    ?required=${input.required}
                                    @change=${(event: Event) => {
                                      onInput(
                                        formKey,
                                        input.name,
                                        (event.currentTarget as HTMLInputElement).files?.[0]?.name ?? ""
                                      );
                                    }}
                                  >
                                </label>
                              </mdsn-field>
                            `;
                          }

                          return html`
                            <mdsn-field>
                              <label>
                                ${label}
                                <input
                                  name=${input.name}
                                  type=${input.secret ? "password" : input.type === "number" ? "number" : "text"}
                                  ?required=${input.required}
                                  .value=${formValues[input.name] ?? ""}
                                  placeholder=${input.name === "message" ? "Write something worth keeping" : ""}
                                  @input=${(event: Event) => {
                                    onInput(formKey, input.name, (event.currentTarget as HTMLInputElement).value);
                                  }}
                                >
                              </label>
                            </mdsn-field>
                          `;
                        })}
                        <mdsn-action>
                          <button type="submit">${operation.label ?? operation.name ?? operation.target}</button>
                        </mdsn-action>
                      </form>
                    </mdsn-form>
                  `;
                })}

                ${postOperations.map((operation) => {
                  const formKey = getFormKey(block.name, operation);
                  const formValues = getFormValues(formKey);
                  const renderableInputs = operation.inputs
                    .map((name) => inputsByName.get(name))
                    .filter((input): input is NonNullable<typeof input> => Boolean(input));

                  return html`
                    <mdsn-form>
                      <form
                        @submit=${(event: Event) => {
                          event.preventDefault();
                          const form = event.currentTarget as HTMLFormElement;
                          if (typeof form.reportValidity === "function" && !form.reportValidity()) {
                            return;
                          }
                          const payload: Record<string, string> = {};
                          for (const name of operation.inputs) {
                            const input = inputsByName.get(name);
                            payload[name] = input ? getInputValue(input, formValues) : formValues[name] ?? "";
                          }
                          void host.submit(operation, payload);
                          valuesByForm[formKey] = {};
                        }}
                      >
                        ${renderableInputs.map((input) => {
                              const label = html`<span class="mdsn-label-text">
                                ${humanizeLabel(input.name)}
                                ${input.required ? html`<span class="mdsn-required" aria-hidden="true">*</span>` : ""}
                              </span>`;

                              if (input.type === "choice") {
                                return html`
                                  <mdsn-field>
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
                                        ${(input.options ?? []).map(
                                          (option) => html`<option value=${option}>${option}</option>`
                                        )}
                                      </select>
                                    </label>
                                  </mdsn-field>
                                `;
                              }

                              if (input.type === "boolean") {
                                return html`
                                  <mdsn-field>
                                    <label>
                                      ${label}
                                      <input
                                        name=${input.name}
                                        type="checkbox"
                                        ?required=${input.required}
                                        .checked=${formValues[input.name] === "true"}
                                        @change=${(event: Event) => {
                                          onInput(
                                            formKey,
                                            input.name,
                                            (event.currentTarget as HTMLInputElement).checked ? "true" : "false"
                                          );
                                        }}
                                      >
                                    </label>
                                  </mdsn-field>
                                `;
                              }

                              if (input.type === "asset") {
                                return html`
                                  <mdsn-field>
                                    <label>
                                      ${label}
                                      <input
                                        name=${input.name}
                                        type="file"
                                        ?required=${input.required}
                                        @change=${(event: Event) => {
                                          onInput(
                                            formKey,
                                            input.name,
                                            (event.currentTarget as HTMLInputElement).files?.[0]?.name ?? ""
                                          );
                                        }}
                                      >
                                    </label>
                                  </mdsn-field>
                                `;
                              }

                              return html`
                                <mdsn-field>
                                  <label>
                                    ${label}
                                    <input
                                      name=${input.name}
                                      type=${input.secret ? "password" : input.type === "number" ? "number" : "text"}
                                      ?required=${input.required}
                                      .value=${formValues[input.name] ?? ""}
                                      placeholder=${input.name === "message" ? "Write something worth keeping" : ""}
                                      @input=${(event: Event) => {
                                        onInput(formKey, input.name, (event.currentTarget as HTMLInputElement).value);
                                      }}
                                    >
                                  </label>
                                </mdsn-field>
                              `;
                            })}
                        <mdsn-action>
                          <button type="submit">${operation.label ?? operation.name ?? operation.target}</button>
                        </mdsn-action>
                      </form>
                    </mdsn-form>
                  `;
                })}
              </mdsn-block>
            `;
          })}
        </mdsn-page>
        ${debugMessages.length > 0
          ? html`
              <aside
                data-mdsn-debug-panel
                style="position:fixed;right:1rem;bottom:1rem;z-index:9999;display:grid;gap:0.75rem;max-width:min(28rem,calc(100vw - 2rem));font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;"
              >
                <button
                  type="button"
                  data-mdsn-debug-toggle
                  style="justify-self:end;border:1px solid #cbd5e1;background:#0f172a;color:#f8fafc;border-radius:999px;padding:0.6rem 0.9rem;box-shadow:0 10px 30px rgba(15,23,42,0.2);cursor:pointer;"
                  @click=${() => {
                    debugDrawerOpen = !debugDrawerOpen;
                    renderSnapshot(host.getSnapshot());
                  }}
                >
                  Debug ${debugMessages.length}
                </button>
                ${debugDrawerOpen
                  ? html`
                      <section
                        data-mdsn-debug-drawer
                        style="background:#020617;color:#e2e8f0;border:1px solid #1e293b;border-radius:1rem;padding:0.9rem;box-shadow:0 16px 40px rgba(15,23,42,0.35);max-height:min(32rem,70vh);overflow:auto;"
                      >
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;margin-bottom:0.75rem;">
                          <strong style="font-size:12px;letter-spacing:0.04em;text-transform:uppercase;">MDSN Debug</strong>
                          <button
                            type="button"
                            style="border:1px solid #334155;background:transparent;color:#cbd5e1;border-radius:999px;padding:0.35rem 0.7rem;cursor:pointer;"
                            @click=${() => {
                              clearDebugMessages();
                              renderSnapshot(host.getSnapshot());
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
      unsubscribe = host.subscribe((snapshot) => {
        renderSnapshot(snapshot);
      });
      host.mount();
    },
    unmount(): void {
      unsubscribe?.();
      unsubscribe = null;
      host.unmount();
      render(html``, container);
    },
    subscribe(listener) {
      return host.subscribe(listener);
    },
    getSnapshot() {
      return host.getSnapshot();
    },
    submit(operation, valuesMap) {
      return host.submit(operation, valuesMap);
    },
    visit(target) {
      return host.visit(target);
    }
  };
}
