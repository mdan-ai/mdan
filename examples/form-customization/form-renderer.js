import { defineFormRenderer, html, nothing } from "@mdanai/sdk/form-renderer";

function fieldLabel(field) {
  return html`<span class="weather-form__label">
    ${field.label}
    ${field.required ? html`<span aria-hidden="true">*</span>` : nothing}
  </span>`;
}

function renderMountedField(operation, field, onInput) {
  const description = field.description
    ? html`<small class="weather-form__help">${field.description}</small>`
    : nothing;

  if (field.control === "select") {
    return html`
      <label class="weather-form__field">
        ${fieldLabel(field)}
        <select
          name=${field.name}
          .value=${field.value}
          ?required=${field.required}
          @change=${(event) => {
            onInput(operation.formKey, field.name, event.currentTarget.value);
          }}
        >
          ${field.omitEmpty ? html`<option value="">Choose</option>` : nothing}
          ${field.options.map((option) => html`<option value=${option}>${option}</option>`)}
        </select>
        ${description}
      </label>
    `;
  }

  if (field.control === "checkbox") {
    return html`
      <label class="weather-form__toggle">
        <input
          name=${field.name}
          type="checkbox"
          .checked=${field.value === "true"}
          @change=${(event) => {
            onInput(operation.formKey, field.name, event.currentTarget.checked ? "true" : "false");
          }}
        >
        <span>${field.label}</span>
      </label>
    `;
  }

  return html`
    <label class="weather-form__field weather-form__field--grow">
      ${fieldLabel(field)}
      <input
        name=${field.name}
        type=${field.inputType ?? "text"}
        .value=${field.value}
        ?required=${field.required}
        @input=${(event) => {
          onInput(operation.formKey, field.name, event.currentTarget.value);
        }}
      >
      ${description}
    </label>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSnapshotField(field) {
  const label = `<span class="weather-form__label">${escapeHtml(field.label)}${field.required ? '<span aria-hidden="true">*</span>' : ""}</span>`;
  const description = field.description ? `<small class="weather-form__help">${escapeHtml(field.description)}</small>` : "";
  const required = field.required ? " required" : "";

  if (field.control === "select") {
    const options = [
      field.omitEmpty ? '<option value="">Choose</option>' : "",
      ...field.options.map((option) => {
        const escaped = escapeHtml(option);
        const selected = field.value === option ? " selected" : "";
        return `<option value="${escaped}"${selected}>${escaped}</option>`;
      })
    ].join("");
    return `<label class="weather-form__field">${label}<select name="${escapeHtml(field.name)}"${required}>${options}</select>${description}</label>`;
  }

  if (field.control === "checkbox") {
    const checked = field.value === "true" ? " checked" : "";
    return `<label class="weather-form__toggle"><input type="checkbox" name="${escapeHtml(field.name)}"${checked}><span>${escapeHtml(field.label)}</span></label>`;
  }

  const value = escapeHtml(field.value);
  return `<label class="weather-form__field weather-form__field--grow">${label}<input type="${escapeHtml(field.inputType ?? "text")}" name="${escapeHtml(field.name)}" value="${value}"${required}>${description}</label>`;
}

function renderWeatherShell(inner) {
  return `<section class="weather-form" data-weather-form>
  <div class="weather-form__intro">
    <p class="weather-form__eyebrow">Custom Form Renderer</p>
    <h2>Weather Query Panel</h2>
    <p>Same action contract, custom panel markup.</p>
  </div>
  ${inner}
</section>`;
}

export const weatherFormRenderer = defineFormRenderer(import.meta.url, "weatherFormRenderer", {
  renderSnapshotOperation(operation) {
    const hiddenFields = operation.hiddenFields
      .map((field) => `<input type="hidden" name="${escapeHtml(field.name)}" value="${escapeHtml(field.value)}">`)
      .join("");
    const fields = operation.fields.map((field) => renderSnapshotField(field)).join("");
    return renderWeatherShell(
      `<form class="weather-form__body" action="${escapeHtml(operation.target)}" method="${operation.methodAttribute}">
        <div class="weather-form__grid">${hiddenFields}${fields}</div>
        <button class="weather-form__submit" type="submit">${escapeHtml(operation.label)}</button>
      </form>`
    );
  },
  renderMountedOperation({ operation, onInput, onSubmit }) {
    return html`
      <section class="weather-form" data-weather-form>
        <div class="weather-form__intro">
          <p class="weather-form__eyebrow">Custom Form Renderer</p>
          <h2>Weather Query Panel</h2>
          <p>Same action contract, custom panel markup.</p>
        </div>
        <form
          class="weather-form__body"
          @submit=${(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            if (typeof form.reportValidity === "function" && !form.reportValidity()) {
              return;
            }
            onSubmit(operation);
          }}
        >
          <div class="weather-form__grid">
            ${operation.fields.map((field) => renderMountedField(operation, field, onInput))}
          </div>
          <button class="weather-form__submit" type="submit">${operation.label}</button>
        </form>
      </section>
    `;
  }
});
