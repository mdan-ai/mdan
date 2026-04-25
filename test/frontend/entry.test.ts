// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";

import { autoBootEntry, bootEntry, createFrontend, resolveEntryRoute, resolveMarkdownRoute } from "../../src/frontend/index.js";

afterEach(() => {
  document.body.replaceChildren();
  document.head.replaceChildren();
  window.__MDAN_ENTRY_BOOTED__ = undefined;
  window.history.replaceState({}, "", "/");
  vi.restoreAllMocks();
});

describe("frontend entry", () => {
  it("resolves the requested route from the browser pathname", () => {
    expect(resolveEntryRoute(undefined)).toBe("/");
    expect(resolveEntryRoute({ pathname: "/login", search: "" } as Location)).toBe("/login");
    expect(resolveEntryRoute({ pathname: "/docs/getting-started/", search: "" } as Location)).toBe("/docs/getting-started");
    expect(resolveEntryRoute({ pathname: "/search", search: "?q=hello" } as Location)).toBe("/search?q=hello");
  });

  it("maps entry routes to raw markdown routes", () => {
    expect(resolveMarkdownRoute("/")).toBe("/index.md");
    expect(resolveMarkdownRoute("/login")).toBe("/login.md");
    expect(resolveMarkdownRoute("/docs/getting-started")).toBe("/docs/getting-started.md");
    expect(resolveMarkdownRoute("/search?q=hello")).toBe("/search.md?q=hello");
  });

  it("boots the shipped frontend against the requested route", () => {
    window.history.replaceState({}, "", "/login");

    const sync = vi.fn(async () => {});
    const runtime = {
      mount: vi.fn(),
      unmount: vi.fn(),
      submit: vi.fn(async () => {}),
      visit: vi.fn(async () => {}),
      sync
    };
    const createHost = vi.fn(() => ({
      subscribe: vi.fn(() => () => {}),
      submit: vi.fn(async () => {}),
      visit: vi.fn(async () => {}),
      sync
    }));
    const mountUi = vi.fn(() => runtime);

    const booted = bootEntry({
      createHost: createHost as never,
      mountUi: mountUi as never,
      fetchImpl: vi.fn() as never
    });

    expect(booted.route).toBe("/login");
    expect(createHost).toHaveBeenCalledWith(
      expect.objectContaining({
        initialRoute: "/login"
      })
    );
    expect(mountUi).toHaveBeenCalled();
    expect(runtime.mount).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenCalledWith("/login");
  });

  it("auto-boots only once per window", () => {
    const runtime = {
      mount: vi.fn(),
      unmount: vi.fn(),
      submit: vi.fn(async () => {}),
      visit: vi.fn(async () => {}),
      sync: vi.fn(async () => {})
    };
    const createHost = vi.fn(() => ({
      subscribe: vi.fn(() => () => {}),
      submit: vi.fn(async () => {}),
      visit: vi.fn(async () => {}),
      sync: vi.fn(async () => {})
    }));
    const mountUi = vi.fn(() => runtime);

    const first = autoBootEntry({
      createHost: createHost as never,
      mountUi: mountUi as never,
      fetchImpl: vi.fn() as never
    });
    const second = autoBootEntry({
      createHost: createHost as never,
      mountUi: mountUi as never,
      fetchImpl: vi.fn() as never
    });

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(createHost).toHaveBeenCalledTimes(1);
    expect(mountUi).toHaveBeenCalledTimes(1);
  });

  it("rewrites GET route fetches to markdown routes while leaving POST requests alone", async () => {
    window.history.replaceState({}, "", "/search?q=hello");
    const fetchImpl = vi.fn(async () => new Response(""));
    const createHost = vi.fn((options: { fetchImpl: typeof fetch }) => ({
      subscribe: vi.fn(() => () => {}),
      submit: vi.fn(async () => {}),
      visit: vi.fn(async () => {}),
      sync: vi.fn(async (target?: string) => {
        await options.fetchImpl(target ?? "/");
      })
    }));
    let host: ReturnType<typeof createHost> | null = null;
    createHost.mockImplementation((options: { fetchImpl: typeof fetch }) => {
      host = {
        subscribe: vi.fn(() => () => {}),
        submit: vi.fn(async () => {}),
        visit: vi.fn(async () => {}),
        sync: vi.fn(async (target?: string) => {
          await options.fetchImpl(target ?? "/");
        })
      };
      return host;
    });
    const mountUi = vi.fn(() => ({
      mount: vi.fn(),
      unmount: vi.fn(),
      submit: vi.fn(async () => {}),
      visit: vi.fn(async () => {}),
      sync: vi.fn(async (target?: string) => {
        await host?.sync(target);
      })
    }));

    const booted = bootEntry({
      createHost: createHost as never,
      mountUi: mountUi as never,
      fetchImpl: fetchImpl as never
    });

    await booted.runtime.sync("/search?q=hello");
    expect(fetchImpl.mock.calls.at(-1)?.[0]).toBe("/search.md?q=hello");
    const lastHeaders = fetchImpl.mock.calls.at(-1)?.[1]?.headers as Headers;
    expect(lastHeaders.get("x-mdan-bootstrap-intent")).toBeNull();
  });

  it("passes a unified frontend extension into the mounted ui", () => {
    const frontend = createFrontend({
      markdown: {
        render(markdown) {
          return `<article>${markdown}</article>`;
        }
      }
    });
    const sync = vi.fn(async () => {});
    const createHost = vi.fn(() => ({
      subscribe: vi.fn(() => () => {}),
      submit: vi.fn(async () => {}),
      visit: vi.fn(async () => {}),
      sync
    }));
    const runtime = {
      mount: vi.fn(),
      unmount: vi.fn(),
      submit: vi.fn(async () => {}),
      visit: vi.fn(async () => {}),
      sync
    };
    const mountUi = vi.fn(() => runtime);

    bootEntry({
      frontend,
      createHost: createHost as never,
      mountUi: mountUi as never,
      fetchImpl: vi.fn() as never
    });

    expect(mountUi).toHaveBeenCalledWith(
      expect.objectContaining({
        frontend: expect.objectContaining({
          markdown: frontend.markdown,
          form: frontend.form
        })
      })
    );
  });

  it("creates an object frontend entry that wraps boot/mount/render around one extension", () => {
    const frontend = createFrontend({
      markdown: {
        render(markdown) {
          return `<article>${markdown}</article>`;
        }
      }
    });
    const sync = vi.fn(async () => {});
    const createHost = vi.fn(() => ({
      subscribe: vi.fn(() => () => {}),
      submit: vi.fn(async () => {}),
      visit: vi.fn(async () => {}),
      sync
    }));
    const runtime = {
      mount: vi.fn(),
      unmount: vi.fn(),
      submit: vi.fn(async () => {}),
      visit: vi.fn(async () => {}),
      sync
    };
    const mountUi = vi.fn(() => runtime);

    frontend.boot({
      createHost: createHost as never,
      mountUi: mountUi as never,
      fetchImpl: vi.fn() as never
    });

    expect(mountUi).toHaveBeenCalledWith(
      expect.objectContaining({
        frontend: expect.objectContaining({
          markdown: frontend.markdown,
          form: frontend.form
        })
      })
    );
  });
});
