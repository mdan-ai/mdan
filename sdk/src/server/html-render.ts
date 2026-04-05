import type {
  MdanMarkdownRenderer,
  MdanBlock,
  MdanFragment,
  MdanHeadlessBlock,
  MdanHeadlessBootstrap,
  MdanInput,
  MdanOperation
} from "../core/index.js";
import { basicMarkdownRenderer } from "../core/index.js";
import type { MdanProtocolDiscovery } from "./types.js";

interface MdanRenderableDocument extends MdanFragment {
  blockContent?: Record<string, string>;
}

const blockAnchorPattern = /^<!--\s*mdan:block\s+([a-zA-Z_][\w-]*)\s*-->$/;

export interface RenderHtmlDocumentOptions {
  kind?: "page" | "fragment";
  route?: string;
  alternateMarkdownHref?: string;
  llmsTxtHref?: string;
  protocol?: {
    discovery?: MdanProtocolDiscovery;
  };
  markdownRenderer?: MdanMarkdownRenderer;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function humanizeLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveActionVariant(operation: MdanOperation): "primary" | "secondary" | "quiet" {
  const signature = `${operation.name ?? ""} ${operation.label ?? ""} ${operation.target}`.toLowerCase();
  if (signature.includes("logout") || signature.includes("log out")) {
    return "quiet";
  }
  if (operation.method === "GET") {
    return "secondary";
  }
  return "primary";
}

function renderInput(input: MdanInput): string {
  const required = input.required ? ' required aria-required="true" data-required="true"' : "";
  const placeholder = input.name === "message" ? ` placeholder="Write something worth keeping"` : "";
  const name = escapeHtml(input.name);
  const labelText = humanizeLabel(name);
  const label = input.required
    ? `<span class="mdan-label-text">${escapeHtml(labelText)} <span class="mdan-required" aria-hidden="true">*</span></span>`
    : `<span class="mdan-label-text">${escapeHtml(labelText)}</span>`;

  if (input.type === "choice") {
    const options = (input.options ?? [])
      .map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
      .join("");
    return `<mdan-field><label>${label}<select name="${name}"${required}>${options}</select></label></mdan-field>`;
  }

  if (input.type === "boolean") {
    return `<mdan-field><label>${label}<input name="${name}" type="checkbox"${required}></label></mdan-field>`;
  }

  if (input.type === "asset") {
    return `<mdan-field><label>${label}<input name="${name}" type="file"${required}></label></mdan-field>`;
  }

  const type = input.secret ? "password" : input.type === "number" ? "number" : "text";
  return `<mdan-field><label>${label}<input name="${name}" type="${type}"${required}${placeholder}></label></mdan-field>`;
}

function renderOperation(operation: MdanOperation, inputs: MdanInput[]): string {
  const variant = resolveActionVariant(operation);
  const actionAttrs = `data-mdan-action-variant="${variant}"`;
  if (operation.method === "GET") {
    if (operation.accept === "text/event-stream") {
      return `<mdan-stream data-mdan-stream-target="${escapeHtml(operation.target)}"></mdan-stream>`;
    }
    const fields = inputs
      .filter((input) => operation.inputs.includes(input.name))
      .map(renderInput)
      .join("");
    return `<mdan-form><form method="GET" action="${escapeHtml(operation.target)}" data-mdan-method="GET" data-mdan-target="${escapeHtml(operation.target)}" ${actionAttrs}>${fields}<mdan-action><button type="submit" ${actionAttrs}>${escapeHtml(operation.label ?? operation.name ?? operation.target)}</button></mdan-action></form></mdan-form>`;
  }

  const fields = inputs
    .filter((input) => operation.inputs.includes(input.name))
    .map(renderInput)
    .join("");

  return `<mdan-form><form method="POST" action="${escapeHtml(operation.target)}" data-mdan-method="POST" data-mdan-target="${escapeHtml(operation.target)}" ${actionAttrs}>${fields}<mdan-action><button type="submit" ${actionAttrs}>${escapeHtml(operation.label ?? operation.name)}</button></mdan-action></form></mdan-form>`;
}

function renderBlock(block: MdanBlock, innerHtml = ""): string {
  const operations = block.operations.map((operation) => renderOperation(operation, block.inputs)).join("");
  return `<mdan-block data-mdan-block="${escapeHtml(block.name)}">${innerHtml}${operations}</mdan-block>`;
}

function escapeScriptJson(value: string): string {
  return value.replaceAll("</script>", "<\\/script>");
}

function resolveBlockMarkdown(
  fragment: MdanRenderableDocument,
  blockName: string,
  hasAnchors: boolean,
  isSingleBlockResponse: boolean
): string {
  if (hasAnchors) {
    return fragment.blockContent?.[blockName]?.trim() ?? "";
  }
  if (isSingleBlockResponse && fragment.blocks[0]?.name === blockName) {
    return fragment.markdown.trim();
  }
  return "";
}

function createHeadlessBlockSnapshot(block: MdanBlock, markdown: string): MdanHeadlessBlock {
  return {
    name: block.name,
    markdown,
    inputs: block.inputs,
    operations: block.operations
  };
}

function createHeadlessBootstrap(
  fragment: MdanRenderableDocument,
  options: RenderHtmlDocumentOptions,
  hasAnchors: boolean,
  isSingleBlockResponse: boolean
): MdanHeadlessBootstrap | null {
  if (options.kind === "page") {
    return {
      kind: "page",
      ...(options.route ? { route: options.route } : {}),
      markdown: fragment.markdown,
      blocks: fragment.blocks.map((block) =>
        createHeadlessBlockSnapshot(block, resolveBlockMarkdown(fragment, block.name, hasAnchors, isSingleBlockResponse))
      )
    };
  }

  if (fragment.blocks.length !== 1) {
    return null;
  }

  const block = fragment.blocks[0];
  if (!block) {
    return null;
  }

  const bootstrap: MdanHeadlessBootstrap = {
    kind: "fragment",
    block: createHeadlessBlockSnapshot(
      block,
      resolveBlockMarkdown(fragment, block.name, hasAnchors, isSingleBlockResponse)
    )
  };

  return bootstrap;
}

function resolveProtocolDiscovery(
  options: Pick<RenderHtmlDocumentOptions, "alternateMarkdownHref" | "llmsTxtHref" | "protocol">
): Partial<MdanProtocolDiscovery> {
  return {
    ...(options.protocol?.discovery?.markdownHref
      ? { markdownHref: options.protocol.discovery.markdownHref }
      : options.alternateMarkdownHref
        ? { markdownHref: options.alternateMarkdownHref }
        : {}),
    ...(options.protocol?.discovery?.llmsTxtHref
      ? { llmsTxtHref: options.protocol.discovery.llmsTxtHref }
      : options.llmsTxtHref
        ? { llmsTxtHref: options.llmsTxtHref }
        : {})
  };
}

export function renderProtocolHeadLinks(discovery: Partial<MdanProtocolDiscovery>): string {
  return [
    discovery.markdownHref
      ? `<link rel="alternate" type="text/markdown" href="${escapeHtml(discovery.markdownHref)}">`
      : "",
    discovery.llmsTxtHref ? `<link rel="llms-txt" href="${escapeHtml(discovery.llmsTxtHref)}">` : ""
  ]
    .filter(Boolean)
    .join("\n    ");
}

export function renderHtmlDiscoveryLinks(options: Pick<RenderHtmlDocumentOptions, "alternateMarkdownHref" | "llmsTxtHref" | "protocol">): string {
  return renderProtocolHeadLinks(resolveProtocolDiscovery(options));
}

export function injectHtmlDiscoveryLinks(
  html: string,
  options: Pick<RenderHtmlDocumentOptions, "alternateMarkdownHref" | "llmsTxtHref" | "protocol">
): string {
  const discovery = resolveProtocolDiscovery(options);
  const links = {
    ...(discovery.markdownHref && !html.includes('rel="alternate" type="text/markdown"')
      ? { markdownHref: discovery.markdownHref }
      : {}),
    ...(discovery.llmsTxtHref && !html.includes('rel="llms-txt"') ? { llmsTxtHref: discovery.llmsTxtHref } : {})
  };
  const tags = renderProtocolHeadLinks(links);

  if (!tags || !html.includes("</head>")) {
    return html;
  }

  return html.replace("</head>", `    ${tags}\n  </head>`);
}

function renderMarkdownWithAnchors(
  markdown: string,
  blocks: MdanBlock[],
  blockContent: Record<string, string> | undefined,
  markdownRenderer: MdanMarkdownRenderer
): string {
  const rendered: string[] = [];
  const buffer: string[] = [];
  const blockMap = new Map(blocks.map((block) => [block.name, block]));

  function flushBuffer(): void {
    const text = buffer.join("\n").trim();
    if (text) {
      rendered.push(markdownRenderer.render(text));
    }
    buffer.length = 0;
  }

  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();
    const anchorMatch = trimmed.match(blockAnchorPattern);
    if (anchorMatch) {
      flushBuffer();
      const block = blockMap.get(anchorMatch[1] ?? "");
      if (block) {
        const innerMarkdown = blockContent?.[anchorMatch[1] ?? ""]?.trim() ?? "";
        rendered.push(renderBlock(block, markdownRenderer.render(innerMarkdown)));
      }
      continue;
    }
    buffer.push(line);
  }

  flushBuffer();
  return rendered.join("\n");
}

export function renderHtmlDocument(fragment: MdanRenderableDocument, options: RenderHtmlDocumentOptions = {}): string {
  const markdownRenderer = options.markdownRenderer ?? basicMarkdownRenderer;
  const hasAnchors = fragment.markdown.includes("<!-- mdan:block");
  const isSingleBlockResponse = !hasAnchors && fragment.blocks.length === 1 && fragment.markdown.trim().length > 0;
  const markdown = hasAnchors
    ? renderMarkdownWithAnchors(fragment.markdown, fragment.blocks, fragment.blockContent, markdownRenderer)
    : isSingleBlockResponse
      ? ""
      : markdownRenderer.render(fragment.markdown);
  const blocks = hasAnchors
    ? ""
    : isSingleBlockResponse
      ? renderBlock(fragment.blocks[0]!, markdownRenderer.render(fragment.markdown))
      : fragment.blocks.map((block) => renderBlock(block)).join("\n");
  const bootstrap = createHeadlessBootstrap(fragment, options, hasAnchors, isSingleBlockResponse);
  const bootstrapScript = bootstrap
    ? `\n    <script id="mdan-bootstrap" type="application/json">${escapeScriptJson(JSON.stringify(bootstrap))}</script>`
    : "";
  const discoveryLinks = renderHtmlDiscoveryLinks(options);
  const discoveryHead = discoveryLinks ? `\n    ${discoveryLinks}` : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
${discoveryHead}
    <style>
      :root {
        font-family: ui-sans-serif, system-ui, sans-serif;
        color: #1f2937;
        background: #f4f7fb;
      }
      body {
        margin: 0;
        padding: 32px 16px;
      }
      main[data-mdan-root] {
        max-width: 760px;
        margin: 0 auto;
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid #dbe3ef;
        border-radius: 24px;
        box-shadow: 0 24px 64px rgba(15, 23, 42, 0.08);
        padding: 28px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: clamp(2.4rem, 5vw, 3.8rem);
        line-height: 0.95;
        letter-spacing: -0.05em;
      }
      h2 {
        margin: 24px 0 10px;
        font-size: 0.95rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #0f766e;
      }
      mdan-block, mdan-form, mdan-field, mdan-action {
        display: block;
      }
      mdan-block {
        margin-top: 20px;
        padding: 20px;
        border-radius: 22px;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        border: 1px solid rgba(148, 163, 184, 0.22);
        box-shadow: 0 20px 44px rgba(15, 23, 42, 0.06);
      }
      form {
        display: grid;
        gap: 14px;
        margin: 10px 0 0;
      }
      label {
        display: grid;
        gap: 8px;
        font-size: 0.82rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #475569;
        font-weight: 700;
      }
      .mdan-label-text {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .mdan-required {
        color: #dc2626;
        font-size: 1rem;
        line-height: 1;
      }
      input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgba(148, 163, 184, 0.32);
        border-radius: 14px;
        padding: 12px 14px;
        font: inherit;
        background: rgba(255, 255, 255, 0.94);
      }
      input:invalid, select:invalid, textarea:invalid {
        border-color: rgba(220, 38, 38, 0.58);
        box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.08);
      }
      mdan-action {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      button {
        border: 0;
        border-radius: 999px;
        padding: 11px 18px;
        font: inherit;
        font-weight: 700;
        color: white;
        background: linear-gradient(180deg, #14b8a6 0%, #0f766e 100%);
        box-shadow: 0 12px 24px rgba(15, 118, 110, 0.22);
        cursor: pointer;
      }
      button[data-mdan-action-variant="secondary"] {
        color: #0f766e;
        background: rgba(240, 253, 250, 0.92);
        border: 1px solid rgba(15, 118, 110, 0.18);
        box-shadow: none;
      }
      button[data-mdan-action-variant="quiet"] {
        color: #334155;
        background: rgba(241, 245, 249, 0.92);
        border: 1px solid rgba(148, 163, 184, 0.22);
        box-shadow: none;
      }
      p {
        line-height: 1.6;
        color: #334155;
      }
      ul {
        list-style: none;
        padding: 0;
        margin: 20px 0;
        display: grid;
        gap: 12px;
      }
      li {
        position: relative;
        padding: 16px 18px 16px 48px;
        border-radius: 18px;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        border: 1px solid #dbe3ef;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
      }
      li::before {
        content: "";
        position: absolute;
        left: 18px;
        top: 18px;
        width: 14px;
        height: 14px;
        border-radius: 999px;
        background: linear-gradient(180deg, #14b8a6 0%, #0f766e 100%);
        box-shadow: 0 0 0 6px rgba(20, 184, 166, 0.12);
      }
    </style>
  </head>
  <body>
    <mdan-page>
      <main data-mdan-root>
        ${markdown}
        ${blocks}
      </main>
    </mdan-page>
${bootstrapScript}
  </body>
</html>`;
}
