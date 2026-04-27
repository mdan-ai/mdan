// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";

import { mountMdanUi } from "../../src/frontend/index.js";
import type { FrontendListener, FrontendSnapshot, FrontendUiHost } from "../../src/frontend/contracts.js";
import type { MdanActionManifest } from "../../src/protocol/surface.js";
import { createHeadlessHost } from "../../src/surface/index.js";

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
      blocks: {
        main: { actions: ["send"] }
      },
      actions: {
        send: {
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
      }
    },
    view: {
      route_path: "/",
      regions
    }
  };
}

function artifactBody(body: FixtureSurface): string {
  const executable = {
    ...body.actions,
    ...(body.view?.regions ? { regions: body.view.regions } : {})
  };

  return `---
route: "${body.view?.route_path ?? "/"}"
---

${body.content.trim()}

\`\`\`mdan
${JSON.stringify(executable, null, 2)}
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

describe("frontend UI with Markdown-first headless host", () => {
  it("renders Markdown and action fields from a Markdown-first headless host", async () => {
    const host = createHeadlessHost({
      initialMarkdown: artifactBody(surface(`# Inbox

Say something useful.

<!-- mdan:block id="main" -->
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

<!-- mdan:block id="main" -->
`, { main: "Message accepted." })
        ),
        { headers: { "Content-Type": "text/markdown" } }
      )
    );
    const host = createHeadlessHost({
      initialMarkdown: artifactBody(surface(`# Compose

Say something useful.

<!-- mdan:block id="main" -->
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

<!-- mdan:block id="main" -->
`))
    });
    const runtime = mountMdanUi({ root, host });

    runtime.mount();
    await settleLitRender();

    expect(root.getAttribute("data-mdan-ui-root")).toBe("");
    expect(root.textContent).toContain("Inbox");
    expect(root.textContent).toContain("Say something useful.");
  });

  it("clears any existing container markup before mounting the interactive ui", async () => {
    const root = document.createElement("main");
    root.id = "mdan-app";
    root.innerHTML = "<h1>Inbox</h1><p>Say something useful.</p>";
    document.body.append(root);

    const host = createHeadlessHost({
      initialMarkdown: artifactBody(surface(`# Inbox

Say something useful.

<!-- mdan:block id="main" -->
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

  it("preserves server-rendered markdown and only mounts actions in html projection mode", async () => {
    const root = document.createElement("main");
    root.setAttribute("data-mdan-ui-root", "");
    root.innerHTML = '<h1>Inbox</h1><section data-mdan-block="main"><p>Say something useful.</p><div data-mdan-action-root data-mdan-block="main"></div></section>';
    document.body.append(root);

    const host = createHeadlessHost({
      initialMarkdown: artifactBody(surface(`# Inbox

Say something useful.

<!-- mdan:block id="main" -->
`))
    });
    const runtime = mountMdanUi({
      root: document,
      host,
      browserProjection: "html"
    });

    runtime.mount();
    await settleLitRender();

    expect(root.querySelectorAll("h1")).toHaveLength(1);
    expect(root.querySelector("h1")?.textContent).toBe("Inbox");
    expect(root.querySelectorAll("p")).toHaveLength(1);
    expect(root.querySelector("textarea[name=\"message\"]")).toBeInstanceOf(HTMLTextAreaElement);
    const actionRoot = root.querySelector('[data-mdan-action-root][data-mdan-block="main"]');
    expect(actionRoot).toBeInstanceOf(HTMLElement);
    expect(actionRoot?.querySelector("textarea[name=\"message\"]")).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("mounts actions into their matching block action roots in html projection mode", async () => {
    const root = document.createElement("main");
    root.setAttribute("data-mdan-ui-root", "");
    root.innerHTML = [
      '<section data-mdan-block="main"><p>Main copy.</p><div data-mdan-action-root data-mdan-block="main"></div></section>',
      '<section data-mdan-block="secondary"><p>Secondary copy.</p><div data-mdan-action-root data-mdan-block="secondary"></div></section>'
    ].join("");
    document.body.append(root);

    const host = createHeadlessHost({
      initialMarkdown: artifactBody({
        content: `# Multi

<!-- mdan:block id="main" -->

<!-- mdan:block id="secondary" -->
`,
        actions: {
          app_id: "json-browser",
          blocks: {
            main: { actions: ["send"] },
            secondary: { actions: ["refresh"] }
          },
          actions: {
            send: {
              label: "Send",
              target: "/messages",
              transport: { method: "POST" },
              input_schema: {
                type: "object",
                properties: {
                  message: { type: "string" }
                },
                additionalProperties: false
              }
            },
            refresh: {
              label: "Refresh",
              verb: "read",
              target: "/refresh",
              transport: { method: "GET" },
              input_schema: {
                type: "object",
                properties: {},
                additionalProperties: false
              }
            }
          }
        },
        view: {
          route_path: "/",
          regions: {
            main: "Main copy.",
            secondary: "Secondary copy."
          }
        }
      })
    });
    const runtime = mountMdanUi({
      root: document,
      host,
      browserProjection: "html"
    });

    runtime.mount();
    await settleLitRender();

    expect(root.querySelector('[data-mdan-action-root][data-mdan-block="main"]')?.textContent).toContain("Send");
    expect(root.querySelector('[data-mdan-action-root][data-mdan-block="main"]')?.textContent).not.toContain("Refresh");
    expect(root.querySelector('[data-mdan-action-root][data-mdan-block="secondary"]')?.textContent).toContain("Refresh");
    expect(root.querySelector('[data-mdan-action-root][data-mdan-block="secondary"]')?.textContent).not.toContain("Send");
  });

  it("patches the target block content after region continuation in html projection mode", async () => {
    const root = document.createElement("main");
    root.setAttribute("data-mdan-ui-root", "");
    root.innerHTML = '<h1>Inbox</h1><section data-mdan-block="main"><p>Server rendered copy stays put.</p><div data-mdan-action-root data-mdan-block="main"></div></section>';
    document.body.append(root);
    const fetchImpl = vi.fn(async () =>
      new Response(
        artifactBody(
          surface(`# Inbox

Server returned updated region markdown.

<!-- mdan:block id="main" -->
`, { main: "Updated region copy." })
        ),
        { headers: { "Content-Type": "text/markdown" } }
      )
    );
    const initial = surface(`# Inbox

Server rendered copy stays put.

<!-- mdan:block id="main" -->
`);
    initial.actions.actions.send.state_effect = {
      response_mode: "region",
      updated_regions: ["main"]
    };
    const host = createHeadlessHost({
      initialMarkdown: artifactBody(initial),
      fetchImpl: fetchImpl as unknown as typeof fetch
    });
    const runtime = mountMdanUi({
      root: document,
      host,
      browserProjection: "html"
    });

    runtime.mount();
    await settleLitRender();

    const textarea = document.querySelector('textarea[name="message"]') as HTMLTextAreaElement;
    textarea.value = "hello";
    textarea.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    document.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    await settleLitRender();

    expect(root.querySelector("h1")?.textContent).toBe("Inbox");
    expect(root.textContent).toContain("Updated region copy.");
    expect(root.textContent).not.toContain("Server rendered copy stays put.");
    expect(root.textContent).not.toContain("Server returned updated region markdown.");
    expect(root.querySelector("textarea[name=\"message\"]")).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("renders host error snapshots as an explicit mdan-error element", async () => {
    const host: FrontendUiHost = {
      subscribe(listener: FrontendListener) {
        const snapshot: FrontendSnapshot = {
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
