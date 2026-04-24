import { describe, expect, it } from "vitest";
import { html } from "lit";

import { createStarterServer } from "../../examples/starter/app.js";
import { createHost } from "../../src/server/bun.js";
import { renderBrowserShell, shouldServeBrowserShell } from "../../src/server/browser-shell.js";
import type { MdanRequest, MdanResponse } from "../../src/server/types.js";

describe("browser shell", () => {
  it("renders a thin Markdown-first browser shell", () => {
    const html = renderBrowserShell({ title: "Starter" });

    expect(html).toContain("<title>Starter</title>");
    expect(html).toContain("bootstrapBrowserShell");
    expect(html).toContain("browser-shell.js");
    expect(html).not.toContain("@mdanai/sdk/ui");
    expect(html).not.toContain("@mdanai/sdk/surface");
  });

  it("renders an initial readable surface as static HTML without JSON bootstrap state", () => {
    const html = renderBrowserShell({
      title: "Starter",
      initialReadableSurface: {
        markdown: "# Starter App\n\nWelcome.",
        actions: {
          app_id: "starter",
          state_id: "starter:home:1",
          state_version: 1,
          blocks: {
            main: { actions: [] }
          },
          actions: {}
        },
        route: "/",
        regions: {
          main: "- Booted"
        }
      }
    });

    expect(html).toContain("<h1>Starter App</h1>");
    expect(html).toContain("<li>Booted</li>");
    expect(html).not.toContain('id="mdan-initial-surface"');
    expect(html).not.toContain("initialSurface");
    expect(html).not.toContain("createHeadlessHost");
  });

  it("lets apps provide their own markdown renderer for initial html projection", () => {
    const html = renderBrowserShell({
      title: "Custom Renderer",
      hydrate: false,
      markdownRenderer: {
        render(markdown) {
          return markdown.replace("| value |", "<table><tbody><tr><td>value</td></tr></tbody></table>");
        }
      },
      initialReadableSurface: {
        markdown: "# Data\n\n| value |",
        actions: {
          app_id: "custom",
          state_id: "custom:1",
          state_version: 1,
          actions: {}
        }
      }
    });

    expect(html).toContain("<table><tbody><tr><td>value</td></tr></tbody></table>");
    expect(html).not.toContain("createHeadlessHost");
    expect(html).not.toContain("mountMdanUi");
    expect(html).not.toContain('id="mdan-initial-surface"');
  });

  it("lets apps provide their own form renderer for initial html projection", () => {
    const pageHtml = renderBrowserShell({
      title: "Custom Form Renderer",
      hydrate: false,
      formRenderer: {
        renderSnapshotOperation(operation) {
          return `<section data-custom-form="${operation.source.name ?? ""}">${operation.label}</section>`;
        },
        renderMountedOperation() {
          return html``;
        }
      },
      initialReadableSurface: {
        markdown: "# Data\n\n<!-- mdan:block id=\"main\" -->",
        route: "/",
        regions: {
          main: "Ready"
        },
        actions: {
          app_id: "custom",
          state_id: "custom:1",
          state_version: 1,
          blocks: {
            main: { actions: ["submit"] }
          },
          actions: {
            submit: {
              label: "Submit",
              verb: "write",
              transport: { method: "POST" },
              target: "/submit"
            }
          }
        }
      }
    });

    expect(pageHtml).toContain('<section data-custom-form="submit">Submit</section>');
    expect(pageHtml).not.toContain("<mdan-form><form");
  });

  it("uses local hosted module URLs when browserShell local-dist mode is enabled", () => {
    const html = renderBrowserShell({
      title: "Starter",
      moduleMode: "local-dist"
    });

    expect(html).toContain('"/__mdan/browser-shell.js"');
    expect(html).not.toContain("https://esm.sh/@mdanai/sdk/dist-browser/browser-shell.js");
  });

  it("keeps explicit module URLs even when local-dist mode is enabled", () => {
    const html = renderBrowserShell({
      title: "Starter",
      moduleMode: "local-dist",
      surfaceModuleSrc: "/custom/surface.js",
      uiModuleSrc: "/custom/ui.js"
    });

    expect(html).toContain('"/custom/surface.js"');
    expect(html).toContain('"/custom/ui.js"');
    expect(html).not.toContain('"/__mdan/browser-shell.js"');
  });

  it("only serves the shell for browser document navigation", () => {
    expect(shouldServeBrowserShell("GET", "text/html")).toBe(true);
    expect(shouldServeBrowserShell("GET", undefined)).toBe(false);
    expect(shouldServeBrowserShell("GET", "application/json")).toBe(false);
    expect(shouldServeBrowserShell("GET", "text/markdown")).toBe(false);
    expect(shouldServeBrowserShell("POST", "text/html")).toBe(false);
  });

  it("lets examples serve snapshot HTML while exposing markdown as the canonical route response", async () => {
    const server = createStarterServer(["Booted"]);
    const host = createHost(server, {
      browserShell: {
        title: "Starter Example"
      }
    });

    const html = await host(
      new Request("https://example.test/", {
        headers: { accept: "text/html" }
      })
    );
    expect(html.status).toBe(200);
    expect(html.headers.get("content-type")).toBe("text/html");
    const htmlText = await html.text();
    expect(htmlText).toContain("<h1>Starter App</h1>");
    expect(htmlText).toContain("Booted");
    expect(htmlText).not.toContain('id="mdan-initial-surface"');
    expect(htmlText).not.toContain("createHeadlessHost");

    const json = await host(
      new Request("https://example.test/", {
        headers: { accept: "application/json" }
      })
    );
    expect(json.status).toBe(406);
    expect(json.headers.get("content-type")).toContain("text/markdown");
    await expect(json.text()).resolves.toContain("## Not Acceptable");

    const markdown = await host(
      new Request("https://example.test/", {
        headers: { accept: "text/markdown" }
      })
    );
    expect(markdown.status).toBe(200);
    expect(markdown.headers.get("content-type")).toContain("text/markdown");
    const markdownText = await markdown.text();
    expect(markdownText).toContain("# Starter App");
    expect(markdownText).not.toContain("createHeadlessHost");
  });

  it("passes through runtime html from a single page handler call", async () => {
    const calls: MdanRequest[] = [];
    const host = createHost(
      {
        async handle(request: MdanRequest): Promise<MdanResponse> {
          calls.push(request);
          return {
            status: 200,
            headers: { "content-type": "text/html" },
            body: "<!doctype html><html><body><h1>Direct Page</h1><p>Rendered once</p></body></html>"
          };
        }
      },
      {
        browserShell: {
          title: "Direct"
        }
      }
    );

    const response = await host(new Request("https://example.test/direct", { headers: { accept: "text/html" } }));
    const body = await response.text();

    expect(calls).toHaveLength(1);
    expect(calls[0]?.headers.accept).toBe("text/html");
    expect(body).toContain("<h1>Direct Page</h1>");
    expect(body).toContain("<p>Rendered once</p>");
    expect(body).not.toContain("createHeadlessHost");
  });

  it("does not repackage runtime json into html in the host layer", async () => {
    const host = createHost(
      {
        async handle(): Promise<MdanResponse> {
          return {
            status: 200,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              content: "# Direct Page",
              actions: {
                app_id: "demo",
                state_id: "demo:direct:1",
                state_version: 1,
                blocks: {
                  main: { actions: [] }
                },
                actions: {}
              },
              view: {
                route_path: "/direct",
                regions: {
                  main: "- Rendered once"
                }
              }
            })
          };
        }
      },
      {
        browserShell: {
          title: "Direct"
        }
      }
    );

    const response = await host(new Request("https://example.test/direct", { headers: { accept: "text/html" } }));
    const body = await response.text();

    expect(response.headers.get("content-type")).toBe("application/json");
    expect(body).toContain("\"state_id\":\"demo:direct:1\"");
    expect(body).not.toContain("<!doctype html>");
  });

  it("defaults non-browser host requests without Accept to markdown markdown responses", async () => {
    const server = createStarterServer(["Booted"]);
    const host = createHost(server, {
      browserShell: {
        title: "Starter Example"
      }
    });

    const response = await host(new Request("https://example.test/"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    await expect(response.text()).resolves.toContain("# Starter App");
  });

  it("serves local dist browser modules when local-dist mode is enabled", async () => {
    const server = createStarterServer(["Booted"]);
    const host = createHost(server, {
      browserShell: {
        title: "Starter Example",
        moduleMode: "local-dist"
      }
    });

    const browserShellModule = await host(new Request("https://example.test/__mdan/browser-shell.js"));
    expect(browserShellModule.status).toBe(200);
    expect(browserShellModule.headers.get("content-type")).toBe("text/javascript");
    const browserShellText = await browserShellModule.text();
    expect(browserShellText).toContain("bootstrapBrowserShell");
    expect(browserShellText).toContain("mountMdanUi");
    expect(browserShellText).not.toContain('from "./');
    expect(browserShellText).not.toContain('from "../');

    const surfaceModule = await host(new Request("https://example.test/__mdan/surface.js"));
    expect(surfaceModule.status).toBe(200);
    expect(surfaceModule.headers.get("content-type")).toBe("text/javascript");
    const surfaceText = await surfaceModule.text();
    expect(surfaceText).toContain("createHeadlessHost");
    expect(surfaceText).not.toContain('from "./');
    expect(surfaceText).not.toContain('from "../');

    const uiModule = await host(new Request("https://example.test/__mdan/ui.js"));
    expect(uiModule.status).toBe(200);
    expect(uiModule.headers.get("content-type")).toBe("text/javascript");
    const uiText = await uiModule.text();
    expect(uiText).toContain("mountMdanUi");
    expect(uiText).not.toContain('from "./');
    expect(uiText).not.toContain('from "../');
  });
});
