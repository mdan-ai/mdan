import { describe, expect, it, vi } from "vitest";

import { createHeadlessHost } from "@mdanai/sdk/web";
import { mountMdanElements, registerMdanElements } from "../../src/elements/index.js";

describe("registerMdanElements", () => {
  it("registers the default custom elements", async () => {
    registerMdanElements();

    const block = document.createElement("mdan-block");
    block.innerHTML = `<button>Submit</button>`;
    document.body.append(block);

    await Promise.resolve();

    expect(customElements.get("mdan-block")).toBeDefined();
    expect(block.shadowRoot?.textContent).toContain("Submit");
  });

  it("renders error content through slots", async () => {
    registerMdanElements();

    const error = document.createElement("mdan-error");
    error.textContent = "Bad credentials";
    document.body.append(error);

    await Promise.resolve();

    expect(error.shadowRoot?.textContent).toContain("Bad credentials");
  });

  it("renders page shell content with stronger hierarchy", async () => {
    registerMdanElements();

    const page = document.createElement("mdan-page");
    page.innerHTML = `<h1>Guestbook</h1><p>Shared notes for the team.</p>`;
    document.body.append(page);

    await Promise.resolve();

    expect(page.shadowRoot?.textContent).toContain("Guestbook");
  });

  it("mounts the default UI from headless bootstrap data", async () => {
    document.body.innerHTML = `
      <script id="mdan-bootstrap" type="application/json">
        {"kind":"page","route":"/guestbook","markdown":"# Guestbook\\n\\nA shared log.\\n\\n<!-- mdan:block guestbook -->","blocks":[{"name":"guestbook","markdown":"## 1 live message\\n\\n- Welcome","inputs":[{"name":"message","type":"text","required":true,"secret":false}],"operations":[{"method":"POST","target":"/post","name":"submit","inputs":["message"],"label":"Submit"}]}]}
      </script>
      <div id="root"></div>
    `;

    const fetchImpl = vi.fn(async () => new Response(""));
    const host = createHeadlessHost({
      root: document,
      fetchImpl
    });
    const runtime = mountMdanElements({
      root: document.getElementById("root")!,
      host
    });

    runtime.mount();
    await Promise.resolve();

    expect(document.getElementById("root")?.textContent).toContain("Guestbook");
    expect(document.getElementById("root")?.textContent).toContain("1 live message");
    expect(document.getElementById("root")?.textContent).toContain("Submit");
  });

  it("keeps form state isolated per block even when input names match", async () => {
    document.body.innerHTML = `
      <div id="root">
        <script id="mdan-bootstrap" type="application/json">
          {"kind":"page","route":"/duo","markdown":"# Duo","blocks":[
            {"name":"alpha","markdown":"## Alpha","inputs":[{"name":"message","type":"text","required":true,"secret":false}],"operations":[{"method":"POST","target":"/alpha","name":"save_alpha","inputs":["message"],"label":"Save Alpha"}]},
            {"name":"beta","markdown":"## Beta","inputs":[{"name":"message","type":"text","required":true,"secret":false}],"operations":[{"method":"POST","target":"/beta","name":"save_beta","inputs":["message"],"label":"Save Beta"}]}
          ]}
        </script>
      </div>
    `;

    const seenBodies: string[] = [];
    const fetchImpl = vi.fn(async (_target, init) => {
      seenBodies.push(String(init?.body ?? ""));
      return new Response(
        `<!doctype html><html><body><script id="mdan-bootstrap" type="application/json">${JSON.stringify({
          kind: "fragment",
          block: {
            name: "alpha",
            markdown: "## Alpha saved",
            inputs: [{ name: "message", type: "text", required: true, secret: false }],
            operations: [{ method: "POST", target: "/alpha", name: "save_alpha", inputs: ["message"], label: "Save Alpha" }]
          }
        })}</script></body></html>`,
        { headers: { "content-type": "text/html" } }
      );
    });
    const host = createHeadlessHost({ root: document.getElementById("root")!, fetchImpl });
    const runtime = mountMdanElements({ root: document.getElementById("root")!, host });

    runtime.mount();
    await Promise.resolve();

    const inputs = [...document.querySelectorAll("input[name='message']")] as HTMLInputElement[];
    inputs[0]!.value = "alpha-only";
    inputs[0]!.dispatchEvent(new Event("input", { bubbles: true }));
    inputs[1]!.value = "beta-only";
    inputs[1]!.dispatchEvent(new Event("input", { bubbles: true }));

    const forms = [...document.querySelectorAll("form")] as HTMLFormElement[];
    forms[1]!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();

    expect(seenBodies[0]).toBe('message: "beta-only"');
  });

  it("renders the target page when a form submit returns a page transition", async () => {
    document.body.innerHTML = `
      <div id="root">
        <script id="mdan-bootstrap" type="application/json">
          {"kind":"page","route":"/login","markdown":"# Sign In","blocks":[{"name":"login","markdown":"## Welcome back","inputs":[{"name":"nickname","type":"text","required":true,"secret":false},{"name":"password","type":"text","required":true,"secret":true}],"operations":[{"method":"POST","target":"/login","name":"login","inputs":["nickname","password"],"label":"Sign In"}]}]}
        </script>
      </div>
    `;

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          `<!doctype html><html><body><script id="mdan-bootstrap" type="application/json">${JSON.stringify({
            kind: "page",
            route: "/vault",
            markdown: "# Vault",
            blocks: [
              {
                name: "vault",
                markdown: "## 0 saved notes\n\n- No private notes yet",
                inputs: [{ name: "message", type: "text", required: true, secret: false }],
                operations: [{ method: "POST", target: "/vault", name: "save", inputs: ["message"], label: "Save Note" }]
              }
            ]
          })}</script></body></html>`,
          { headers: { "content-type": "text/html" } }
        )
      );

    const pushState = vi.fn();
    const originalHistory = window.history;
    Object.defineProperty(window, "history", {
      configurable: true,
      value: {
        ...originalHistory,
        pushState
      }
    });

    try {
      const host = createHeadlessHost({ root: document.getElementById("root")!, fetchImpl });
      const runtime = mountMdanElements({ root: document.getElementById("root")!, host });

      runtime.mount();
      await Promise.resolve();

      const inputs = [...document.querySelectorAll("input")] as HTMLInputElement[];
      inputs[0]!.value = "Ada";
      inputs[0]!.dispatchEvent(new Event("input", { bubbles: true }));
      inputs[1]!.value = "1234";
      inputs[1]!.dispatchEvent(new Event("input", { bubbles: true }));

      const form = document.querySelector("form") as HTMLFormElement;
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(pushState).toHaveBeenCalledWith({}, "", "/vault");
      expect(document.getElementById("root")?.textContent).toContain("Vault");
      expect(document.getElementById("root")?.textContent).toContain("No private notes yet");
    } finally {
      Object.defineProperty(window, "history", {
        configurable: true,
        value: originalHistory
      });
    }
  });

  it("submits declared GET input values through the default elements UI", async () => {
    document.body.innerHTML = `
      <div id="root">
        <script id="mdan-bootstrap" type="application/json">
          {"kind":"page","route":"/search","markdown":"# Search","blocks":[{"name":"search","markdown":"## Find a note","inputs":[{"name":"query","type":"text","required":true,"secret":false}],"operations":[{"method":"GET","target":"/search","name":"search","inputs":["query"],"label":"Search"}]}]}
        </script>
      </div>
    `;

    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(
        `<!doctype html><html><body><script id="mdan-bootstrap" type="application/json">${JSON.stringify({
          kind: "page",
          route: "/search?query=hello",
          markdown: "# Search",
          blocks: [
            {
              name: "search",
              markdown: "## Results for hello",
              inputs: [{ name: "query", type: "text", required: true, secret: false }],
              operations: [{ method: "GET", target: "/search", name: "search", inputs: ["query"], label: "Search" }]
            }
          ]
        })}</script></body></html>`,
        { headers: { "content-type": "text/html" } }
      )
    );

    const host = createHeadlessHost({ root: document.getElementById("root")!, fetchImpl });
    const runtime = mountMdanElements({ root: document.getElementById("root")!, host });

    runtime.mount();
    await Promise.resolve();

    const input = document.querySelector("input[name='query']") as HTMLInputElement | null;
    expect(input).toBeTruthy();
    input!.value = "hello";
    input!.dispatchEvent(new Event("input", { bubbles: true }));

    const form = document.querySelector("form") as HTMLFormElement;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "/search?query=hello",
      expect.objectContaining({
        method: "GET"
      })
    );
    expect(document.getElementById("root")?.textContent).toContain("Results for hello");
  });

  it("submits the first choice option when the user leaves the default selection unchanged", async () => {
    document.body.innerHTML = `
      <div id="root">
        <script id="mdan-bootstrap" type="application/json">
          {"kind":"page","route":"/compose","markdown":"# Compose","blocks":[{"name":"compose","markdown":"## Draft","inputs":[{"name":"status","type":"choice","required":false,"secret":false,"options":["draft","published"]}],"operations":[{"method":"POST","target":"/compose","name":"save","inputs":["status"],"label":"Save"}]}]}
        </script>
      </div>
    `;

    const seenBodies: string[] = [];
    const fetchImpl = vi.fn(async (_target, init) => {
      seenBodies.push(String(init?.body ?? ""));
      return new Response(
        `<!doctype html><html><body><script id="mdan-bootstrap" type="application/json">${JSON.stringify({
          kind: "fragment",
          block: {
            name: "compose",
            markdown: "## Saved",
            inputs: [{ name: "status", type: "choice", required: false, secret: false, options: ["draft", "published"] }],
            operations: [{ method: "POST", target: "/compose", name: "save", inputs: ["status"], label: "Save" }]
          }
        })}</script></body></html>`,
        { headers: { "content-type": "text/html" } }
      );
    });

    const host = createHeadlessHost({ root: document.getElementById("root")!, fetchImpl });
    const runtime = mountMdanElements({ root: document.getElementById("root")!, host });

    runtime.mount();
    await Promise.resolve();

    const form = document.querySelector("form") as HTMLFormElement;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();

    expect(seenBodies[0]).toBe('status: "draft"');
  });

  it("submits false for unchecked boolean inputs by default", async () => {
    document.body.innerHTML = `
      <div id="root">
        <script id="mdan-bootstrap" type="application/json">
          {"kind":"page","route":"/compose","markdown":"# Compose","blocks":[{"name":"compose","markdown":"## Draft","inputs":[{"name":"published","type":"boolean","required":false,"secret":false}],"operations":[{"method":"POST","target":"/compose","name":"save","inputs":["published"],"label":"Save"}]}]}
        </script>
      </div>
    `;

    const seenBodies: string[] = [];
    const fetchImpl = vi.fn(async (_target, init) => {
      seenBodies.push(String(init?.body ?? ""));
      return new Response(
        `<!doctype html><html><body><script id="mdan-bootstrap" type="application/json">${JSON.stringify({
          kind: "fragment",
          block: {
            name: "compose",
            markdown: "## Saved",
            inputs: [{ name: "published", type: "boolean", required: false, secret: false }],
            operations: [{ method: "POST", target: "/compose", name: "save", inputs: ["published"], label: "Save" }]
          }
        })}</script></body></html>`,
        { headers: { "content-type": "text/html" } }
      );
    });

    const host = createHeadlessHost({ root: document.getElementById("root")!, fetchImpl });
    const runtime = mountMdanElements({ root: document.getElementById("root")!, host });

    runtime.mount();
    await Promise.resolve();

    const form = document.querySelector("form") as HTMLFormElement;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();

    expect(seenBodies[0]).toBe('published: "false"');
  });

  it("uses an injected markdown renderer for default elements output", async () => {
    document.body.innerHTML = `
      <script id="mdan-bootstrap" type="application/json">
        {"kind":"page","route":"/guestbook","markdown":"# Guestbook","blocks":[]}
      </script>
      <div id="root"></div>
    `;

    const fetchImpl = vi.fn(async () => new Response(""));
    const host = createHeadlessHost({
      root: document,
      fetchImpl
    });
    const runtime = mountMdanElements({
      root: document.getElementById("root")!,
      host,
      markdownRenderer: {
        render(markdown) {
          return `<section data-renderer="custom">${markdown.toUpperCase()}</section>`;
        }
      }
    });

    runtime.mount();
    await Promise.resolve();

    expect(document.querySelector("[data-renderer='custom']")?.textContent).toContain("GUESTBOOK");
  });

  it("can expose raw markdown request and response messages through the mounted browser runtime", async () => {
    document.body.innerHTML = `
      <script id="mdan-bootstrap" type="application/json">
        {"kind":"page","route":"/guestbook","markdown":"# Guestbook","blocks":[{"name":"guestbook","markdown":"## 1 live message","inputs":[{"name":"message","type":"text","required":true,"secret":false}],"operations":[{"method":"POST","target":"/post","name":"submit","inputs":["message"],"label":"Submit"}]}]}
      </script>
      <div id="root"></div>
    `;

    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
    const fetchImpl = vi.fn(async (_target, init) =>
      new Response(
        `<!doctype html><html><body><script id="mdan-bootstrap" type="application/json">${JSON.stringify({
          kind: "fragment",
          block: {
            name: "guestbook",
            markdown: "## 2 live messages\n\n- Hello",
            inputs: [{ name: "message", type: "text", required: true, secret: false }],
            operations: [{ method: "POST", target: "/post", name: "submit", inputs: ["message"], label: "Submit" }]
          }
        })}</script></body></html>`,
        { headers: { "content-type": "text/html" } }
      )
    );

    delete (window as typeof window & { __MDAN_DEBUG__?: unknown }).__MDAN_DEBUG__;

    try {
      const host = createHeadlessHost({
        root: document,
        fetchImpl,
        debugMessages: true
      });
      const runtime = mountMdanElements({
        root: document.getElementById("root")!,
        host
      });

      runtime.mount();
      await Promise.resolve();

      const input = document.querySelector("input[name='message']") as HTMLInputElement;
      input.value = "Hello";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      const form = document.querySelector("form") as HTMLFormElement;
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const debugState = (window as typeof window & {
        __MDAN_DEBUG__?: {
          messages: Array<{ direction: string; method: string; url: string; markdown: string }>;
        };
      }).__MDAN_DEBUG__;

      expect(debugState?.messages).toEqual([
        {
          direction: "send",
          method: "POST",
          url: "/post",
          markdown: 'message: "Hello"'
        },
        {
          direction: "receive",
          method: "POST",
          url: "/post",
          markdown: "## 2 live messages\n\n- Hello"
        }
      ]);
      expect(consoleInfo).toHaveBeenCalled();
    } finally {
      consoleInfo.mockRestore();
      delete (window as typeof window & { __MDAN_DEBUG__?: unknown }).__MDAN_DEBUG__;
    }
  });

  it("renders a collapsible debug drawer when debug messages are enabled", async () => {
    document.body.innerHTML = `
      <script id="mdan-bootstrap" type="application/json">
        {"kind":"page","route":"/guestbook","markdown":"# Guestbook","blocks":[{"name":"guestbook","markdown":"## 1 live message","inputs":[{"name":"message","type":"text","required":true,"secret":false}],"operations":[{"method":"POST","target":"/post","name":"submit","inputs":["message"],"label":"Submit"}]}]}
      </script>
      <div id="root"></div>
    `;

    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
    const fetchImpl = vi.fn(async () =>
      new Response(
        `<!doctype html><html><body><script id="mdan-bootstrap" type="application/json">${JSON.stringify({
          kind: "fragment",
          block: {
            name: "guestbook",
            markdown: "## 2 live messages\n\n- Hello",
            inputs: [{ name: "message", type: "text", required: true, secret: false }],
            operations: [{ method: "POST", target: "/post", name: "submit", inputs: ["message"], label: "Submit" }]
          }
        })}</script></body></html>`,
        { headers: { "content-type": "text/html" } }
      )
    );

    delete (window as typeof window & { __MDAN_DEBUG__?: unknown }).__MDAN_DEBUG__;

    try {
      const host = createHeadlessHost({
        root: document,
        fetchImpl,
        debugMessages: true
      });
      const runtime = mountMdanElements({
        root: document.getElementById("root")!,
        host
      });

      runtime.mount();
      await Promise.resolve();

      const input = document.querySelector("input[name='message']") as HTMLInputElement;
      input.value = "Hello";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      const form = document.querySelector("form") as HTMLFormElement;
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const toggle = document.querySelector("[data-mdan-debug-toggle]") as HTMLButtonElement | null;
      expect(toggle).toBeTruthy();
      expect(toggle?.textContent).toContain("2");

      toggle?.click();
      await Promise.resolve();

      const drawer = document.querySelector("[data-mdan-debug-drawer]") as HTMLElement | null;
      expect(drawer).toBeTruthy();
      expect(drawer?.textContent).toContain("send");
      expect(drawer?.textContent).toContain("receive");
      expect(drawer?.textContent).toContain('/post');
      expect(drawer?.textContent).toContain('message: "Hello"');
      expect(drawer?.textContent).toContain("## 2 live messages");
    } finally {
      consoleInfo.mockRestore();
      delete (window as typeof window & { __MDAN_DEBUG__?: unknown }).__MDAN_DEBUG__;
    }
  });
});
