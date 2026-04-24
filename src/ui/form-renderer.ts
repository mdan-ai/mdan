import { html, nothing, type TemplateResult } from "lit";

import type { UiFieldView, UiOperationView } from "./model.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSnapshotField(field: UiFieldView, method: "get" | "post"): string {
  const label = escapeHtml(field.label);
  const name = escapeHtml(field.name);
  const required = field.required ? " required" : "";
  const omitEmpty = field.omitEmpty ? ' data-mdan-omit-empty="true"' : "";
  const description = field.description ? `<small class="mdan-field-help">${escapeHtml(field.description)}</small>` : "";
  const value = escapeHtml(field.value);
  const labelText = `<span class="mdan-label-text">${label}${field.required ? '<span class="mdan-required" aria-hidden="true">*</span>' : ""}</span>`;

  if (field.control === "select") {
    const placeholder = field.omitEmpty ? `<option value="" selected>default</option>` : "";
    const options = field.options
      .map((option) => {
        const escaped = escapeHtml(option);
        const selected = value === escaped ? " selected" : "";
        return `<option value="${escaped}"${selected}>${escaped}</option>`;
      })
      .join("");
    return `<mdan-field><label>${labelText}<select name="${name}"${required}${omitEmpty}>${placeholder}${options}</select>${description}</label></mdan-field>`;
  }

  if (field.control === "checkbox") {
    const hiddenFalse = method === "post" ? `<input type="hidden" name="${name}" value="false">` : "";
    const checked = value === "true" ? " checked" : "";
    return `<mdan-field><label>${labelText}${hiddenFalse}<input type="checkbox" name="${name}" value="true"${checked}${omitEmpty}>${description}</label></mdan-field>`;
  }

  if (field.control === "file") {
    return `<mdan-field><label>${labelText}<input type="file" name="${name}"${required}${omitEmpty}>${description}</label></mdan-field>`;
  }

  if (field.control === "textarea") {
    const minLength = typeof field.constraints?.minLength === "number" ? ` minlength="${field.constraints.minLength}"` : "";
    const maxLength = typeof field.constraints?.maxLength === "number" ? ` maxlength="${field.constraints.maxLength}"` : "";
    const pattern = typeof field.constraints?.pattern === "string" ? ` pattern="${escapeHtml(field.constraints.pattern)}"` : "";
    return `<mdan-field><label>${labelText}<textarea name="${name}"${required}${omitEmpty}${minLength}${maxLength}${pattern}>${value}</textarea>${description}</label></mdan-field>`;
  }

  const type = field.inputType ?? "text";
  const min = typeof field.constraints?.minimum === "number" ? ` min="${field.constraints.minimum}"` : "";
  const max = typeof field.constraints?.maximum === "number" ? ` max="${field.constraints.maximum}"` : "";
  const minLength = typeof field.constraints?.minLength === "number" ? ` minlength="${field.constraints.minLength}"` : "";
  const maxLength = typeof field.constraints?.maxLength === "number" ? ` maxlength="${field.constraints.maxLength}"` : "";
  const pattern = typeof field.constraints?.pattern === "string" ? ` pattern="${escapeHtml(field.constraints.pattern)}"` : "";
  return `<mdan-field><label>${labelText}<input type="${type}" name="${name}" value="${value}"${required}${omitEmpty}${min}${max}${minLength}${maxLength}${pattern}>${description}</label></mdan-field>`;
}

export interface MountedOperationRenderOptions {
  operation: UiOperationView;
  onInput: (formKey: string, name: string, value: string | File) => void;
  onSubmit: (operation: UiOperationView) => void;
}

export interface UiFormRenderer {
  renderSnapshotOperation(operation: UiOperationView): string;
  renderMountedOperation(options: MountedOperationRenderOptions): TemplateResult;
}

function renderDefaultSnapshotOperation(operation: UiOperationView): string {
  const hiddenFields = operation.hiddenFields
    .map((field) => `<input type="hidden" name="${escapeHtml(field.name)}" value="${escapeHtml(field.value)}">`)
    .join("");
  const fields = operation.fields.map((field) => renderSnapshotField(field, operation.methodAttribute)).join("");
  const label = escapeHtml(operation.label);
  const trimEmptyOnSubmit =
    operation.methodAttribute === "get"
      ? ' onsubmit="for (const el of this.querySelectorAll(\'[data-mdan-omit-empty=&quot;true&quot;]\')) { if (el instanceof HTMLInputElement && el.type === \'checkbox\') { if (!el.checked) el.disabled = true; continue; } if (\'value\' in el && !el.value) el.disabled = true; }"'
      : "";

  return `<mdan-form><form action="${escapeHtml(operation.target)}" method="${operation.methodAttribute}" enctype="${operation.enctype}" data-mdan-action-variant="${escapeHtml(operation.actionVariant)}" data-mdan-action-behavior="${escapeHtml(operation.actionBehavior)}"${trimEmptyOnSubmit}>${hiddenFields}${fields}<mdan-action><button type="submit" data-mdan-action-variant="${escapeHtml(operation.actionVariant)}" data-mdan-action-behavior="${escapeHtml(operation.actionBehavior)}">${label}</button></mdan-action></form></mdan-form>`;
}

function renderMountedField(
  operation: UiOperationView,
  field: UiFieldView,
  onInput: MountedOperationRenderOptions["onInput"]
): TemplateResult {
  const label = html`<span class="mdan-label-text">
    ${field.label}
    ${field.required ? html`<span class="mdan-required" aria-hidden="true">*</span>` : ""}
  </span>`;
  const description = field.description ? html`<small class="mdan-field-help">${field.description}</small>` : nothing;

  if (field.control === "select") {
    return html`
      <mdan-field>
        <label>
          ${label}
          <select
            name=${field.name}
            ?required=${field.required}
            .value=${field.value}
            @change=${(event: Event) => {
              onInput(operation.formKey, field.name, (event.currentTarget as HTMLSelectElement).value);
            }}
          >
            ${field.omitEmpty ? html`<option value="">default</option>` : nothing}
            ${field.options.map((option) => html`<option value=${option}>${option}</option>`)}
          </select>
          ${description}
        </label>
      </mdan-field>
    `;
  }

  if (field.control === "checkbox") {
    return html`
      <mdan-field>
        <label>
          ${label}
          <input
            name=${field.name}
            type="checkbox"
            ?required=${field.required}
            .checked=${field.value === "true"}
            @change=${(event: Event) => {
              onInput(operation.formKey, field.name, (event.currentTarget as HTMLInputElement).checked ? "true" : "false");
            }}
          >
          ${description}
        </label>
      </mdan-field>
    `;
  }

  if (field.control === "file") {
    return html`
      <mdan-field>
        <label>
          ${label}
          <input
            name=${field.name}
            type="file"
            ?required=${field.required}
            @change=${(event: Event) => {
              const file = (event.currentTarget as HTMLInputElement).files?.[0];
              onInput(operation.formKey, field.name, file ?? "");
            }}
          >
          ${description}
        </label>
      </mdan-field>
    `;
  }

  if (field.control === "textarea") {
    return html`
      <mdan-field>
        <label>
          ${label}
          <textarea
            name=${field.name}
            ?required=${field.required}
            .value=${field.value}
            minlength=${field.constraints?.minLength ?? nothing}
            maxlength=${field.constraints?.maxLength ?? nothing}
            pattern=${field.constraints?.pattern ?? nothing}
            @input=${(event: Event) => {
              onInput(operation.formKey, field.name, (event.currentTarget as HTMLTextAreaElement).value);
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
          name=${field.name}
          type=${field.inputType ?? "text"}
          ?required=${field.required}
          .value=${field.value}
          min=${field.constraints?.minimum ?? nothing}
          max=${field.constraints?.maximum ?? nothing}
          minlength=${field.constraints?.minLength ?? nothing}
          maxlength=${field.constraints?.maxLength ?? nothing}
          pattern=${field.constraints?.pattern ?? nothing}
          @input=${(event: Event) => {
            onInput(operation.formKey, field.name, (event.currentTarget as HTMLInputElement).value);
          }}
        >
        ${description}
      </label>
    </mdan-field>
  `;
}

function renderDefaultMountedOperation(options: MountedOperationRenderOptions): TemplateResult {
  const { operation, onInput, onSubmit } = options;

  return html`
    <mdan-form>
      <form
        data-mdan-action-variant=${operation.actionVariant}
        data-mdan-action-behavior=${operation.actionBehavior}
        enctype=${operation.enctype}
        @submit=${(event: Event) => {
          event.preventDefault();
          const form = event.currentTarget as HTMLFormElement;
          if (typeof form.reportValidity === "function" && !form.reportValidity()) {
            return;
          }
          onSubmit(operation);
        }}
      >
        ${operation.fields.map((field) => renderMountedField(operation, field, onInput))}
        <mdan-action>
          <button
            type="submit"
            data-mdan-action-variant=${operation.actionVariant}
            data-mdan-action-behavior=${operation.actionBehavior}
          >
            ${operation.label}
          </button>
        </mdan-action>
      </form>
    </mdan-form>
  `;
}

export const defaultUiFormRenderer: UiFormRenderer = {
  renderSnapshotOperation: renderDefaultSnapshotOperation,
  renderMountedOperation: renderDefaultMountedOperation
};
