import type { MdanHeadlessBootstrap } from "../core/types.js";

export const MDAN_BOOTSTRAP_SCRIPT_ID = "mdan-bootstrap";

function escapeScriptJson(value: string): string {
  return value.replaceAll("</script>", "<\\/script>");
}

export function findBootstrapScript(root: ParentNode): HTMLScriptElement | null {
  if (root instanceof Document) {
    const element = root.getElementById(MDAN_BOOTSTRAP_SCRIPT_ID);
    return element instanceof HTMLScriptElement ? element : null;
  }

  for (const child of Array.from(root.childNodes)) {
    if (child instanceof HTMLScriptElement && child.id === MDAN_BOOTSTRAP_SCRIPT_ID) {
      return child;
    }
    if (child instanceof Element) {
      const nested = findBootstrapScript(child);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

export function parseBootstrapFromRoot(root: ParentNode): MdanHeadlessBootstrap {
  const element = findBootstrapScript(root);
  if (!(element instanceof HTMLScriptElement) || !element.textContent?.trim()) {
    throw new Error("Missing mdan bootstrap data.");
  }
  return JSON.parse(element.textContent) as MdanHeadlessBootstrap;
}

export function parseBootstrapFromHtml(content: string): MdanHeadlessBootstrap {
  const document = new DOMParser().parseFromString(content, "text/html");
  return parseBootstrapFromRoot(document);
}

export function serializeBootstrapScript(bootstrap: MdanHeadlessBootstrap): string {
  return `<script id="${MDAN_BOOTSTRAP_SCRIPT_ID}" type="application/json">${escapeScriptJson(JSON.stringify(bootstrap))}</script>`;
}
