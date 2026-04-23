// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";

import { mountMdanUi } from "../../src/ui/index.js";
import type { MdanActionManifest } from "../../src/protocol/surface.js";
import { createHeadlessHost } from "../../src/surface/index.js";
import type { HeadlessListener, HeadlessSnapshot, MdanHeadlessUiHost } from "../../src/surface/protocol.js";

type FixtureSurface = {
  content: string;
  actions: MdanActionManifest;
  view?: {
    route_path?: string;
    regions?: Record<string, string>;
  };
};

function surface(content: string, regions: Record<string, string> = { main: "Say something useful." }): FixtureSurface {
  return {
    content,
    actions: {
      app_id: "json-browser",
      blocks: ["main"],
      actions: [
        {
          id: "send",
          label: "Send",
          verb: "write",
          target: "/messages",
          transport: { method: "POST" },
          input_schema: {
            type: "object",
            required: ["message"],
            properties: {
              message: { type: "string", format: "textarea" }
            },
            additionalProperties: false
          }
        }
      ],
      allowed_next_actions: ["send"]
    },
    view: {
      route_path: "/",
      regions
    }
  };
}

function artifactBody(body: FixtureSurface): string {
  return `---
route: "${body.view?.route_path ?? "/"}"
---

${body.content.trim()}

\`\`\`mdan
${JSON.stringify(body.actions, null, 2)}
\`\`\`
`;
}

async function settleLitRender(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  document.body.replaceChildren();
  document.head.replaceChildren();
  vi.restoreAllMocks();
});

describe("ui with Markdown-first headless host", () => {
  it("renders Markdown and action fields from a Markdown-first headless host", async () => {
    const host = createHeadlessHost({
      initialMarkdown: artifactBody(surface(`# Inbox

Say something useful.

::: block{id="main" actions="send"}
`))
    });
    const runtime = mountMdanUi({ root: document, host });

    runtime.mount();
    await settleLitRender();

    expect(document.body.textContent).toContain("Inbox");
    expect(document.body.textContent).toContain("Say something useful.");
    expect(document.querySelector('textarea[name="message"]')).toBeInstanceOf(HTMLTextAreaElement);
    expect(document.querySelector("button")?.textContent).toContain("Send");
  });

  it("submits rendered action forms through a Markdown-first headless host", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        artifactBody(
          surface(`# Sent

Message accepted.

::: block{id="main" actions="send"}
`, { main: "Message accepted." })
        ),
        { headers: { "Content-Type": "text/markdown" } }
      )
    );
    const host = createHeadlessHost({
      initialMarkdown: artifactBody(surface(`# Compose

Say something useful.

::: block{id="main" actions="send"}
`)),
      fetchImpl: fetchImpl as unknown as typeof fetch
    });
    const runtime = mountMdanUi({ root: document, host });

    runtime.mount();
    await settleLitRender();

    const textarea = document.querySelector('textarea[name="message"]') as HTMLTextAreaElement;
    textarea.value = "hello from ui";
    textarea.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    document.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;

    expect(new Headers(init.headers).get("Accept")).toBe("text/markdown");
    expect(JSON.parse(String(init.body))).toEqual({ input: { message: "hello from ui" } });
  });

  it("marks an existing HTMLElement root as the visible ui container", async () => {
    const root = document.createElement("main");
    root.id = "mdan-app";
    document.body.append(root);

    const host = createHeadlessHost({
      initialMarkdown: artifactBody(surface(`# Inbox

Say something useful.

::: block{id="main" actions="send"}
`))
    });
    const runtime = mountMdanUi({ root, host });

    runtime.mount();
    await settleLitRender();

    expect(root.getAttribute("data-mdan-ui-root")).toBe("");
    expect(root.textContent).toContain("Inbox");
    expect(root.textContent).toContain("Say something useful.");
  });

  it("replaces browser-shell snapshot markup instead of duplicating it on mount", async () => {
    const root = document.createElement("main");
    root.id = "mdan-app";
    root.setAttribute("data-mdan-browser-shell", "");
    root.innerHTML = "<h1>Inbox</h1><p>Say something useful.</p>";
    document.body.append(root);

    const host = createHeadlessHost({
      initialMarkdown: artifactBody(surface(`# Inbox

Say something useful.

::: block{id="main" actions="send"}
`))
    });
    const runtime = mountMdanUi({ root, host });

    runtime.mount();
    await settleLitRender();

    expect(root.querySelectorAll("h1")).toHaveLength(1);
    expect(root.textContent).toContain("Inbox");
    expect(root.textContent).toContain("Say something useful.");
    expect(root.querySelector("textarea[name=\"message\"]")).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("renders host error snapshots as an explicit mdan-error element", async () => {
    const host: MdanHeadlessUiHost = {
      subscribe(listener: HeadlessListener) {
        const snapshot: HeadlessSnapshot = {
          status: "error",
          transition: "page",
          route: "/broken",
          markdown: "Something broke while loading this surface.",
          error: "Something broke while loading this surface.",
          blocks: []
        };
        listener(snapshot);
        return () => {};
      },
      async submit() {},
      async visit() {},
      async sync() {}
    };
    const runtime = mountMdanUi({ root: document, host });

    runtime.mount();
    await settleLitRender();

    expect(document.querySelector("mdan-error")?.textContent).toContain("Something broke");
  });
});
