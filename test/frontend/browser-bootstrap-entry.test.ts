// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";

import { bootEntry } from "../../src/frontend/index.js";

const BOOTSTRAP_HEADER = "x-mdan-bootstrap-intent";

afterEach(() => {
  document.body.replaceChildren();
  document.head.replaceChildren();
  window.__MDAN_ENTRY_BOOTED__ = undefined;
  window.history.replaceState({}, "", "/");
  vi.restoreAllMocks();
});

describe("frontend browser bootstrap entry intent", () => {
  it("adds the SDK bootstrap intent to the first entry-driven sync request", async () => {
    window.history.replaceState({}, "", "/login");
    const fetchImpl = vi.fn(async () => new Response(""));
    let hostFetch: typeof fetch | null = null;

    const createHost = vi.fn((options: { fetchImpl: typeof fetch }) => {
      hostFetch = options.fetchImpl;
      return {
        subscribe: vi.fn(() => () => {}),
        submit: vi.fn(async () => {}),
        visit: vi.fn(async () => {}),
        sync: vi.fn(async (target?: string) => {
          await options.fetchImpl(target ?? "/");
        })
      };
    });
    const runtime = {
      mount: vi.fn(),
      unmount: vi.fn(),
      submit: vi.fn(async () => {}),
      visit: vi.fn(async () => {}),
      sync: vi.fn(async (target?: string) => {
        await hostFetch?.(target ?? "/");
      })
    };

    bootEntry({
      createHost: createHost as never,
      mountUi: vi.fn(() => runtime) as never,
      fetchImpl: fetchImpl as never
    });

    await Promise.resolve();

    expect(fetchImpl).toHaveBeenCalledWith(
      "/login.md",
      expect.objectContaining({
        headers: expect.any(Headers)
      })
    );
    const firstHeaders = fetchImpl.mock.calls[0]?.[1]?.headers as Headers;
    expect(firstHeaders.get(BOOTSTRAP_HEADER)).toBe("entry");
  });

  it("does not attach the bootstrap intent to later entry requests", async () => {
    window.history.replaceState({}, "", "/login");
    const fetchImpl = vi.fn(async () => new Response(""));
    let hostFetch: typeof fetch | null = null;

    const createHost = vi.fn((options: { fetchImpl: typeof fetch }) => {
      hostFetch = options.fetchImpl;
      return {
        subscribe: vi.fn(() => () => {}),
        submit: vi.fn(async () => {}),
        visit: vi.fn(async () => {}),
        sync: vi.fn(async (target?: string) => {
          await options.fetchImpl(target ?? "/");
        })
      };
    });
    const runtime = {
      mount: vi.fn(),
      unmount: vi.fn(),
      submit: vi.fn(async () => {}),
      visit: vi.fn(async () => {}),
      sync: vi.fn(async (target?: string) => {
        await hostFetch?.(target ?? "/");
      })
    };

    const booted = bootEntry({
      createHost: createHost as never,
      mountUi: vi.fn(() => runtime) as never,
      fetchImpl: fetchImpl as never
    });

    await Promise.resolve();
    await booted.runtime.sync("/search?q=hello");

    const firstHeaders = fetchImpl.mock.calls[0]?.[1]?.headers as Headers;
    const secondHeaders = fetchImpl.mock.calls[1]?.[1]?.headers as Headers;

    expect(firstHeaders.get(BOOTSTRAP_HEADER)).toBe("entry");
    expect(secondHeaders.get(BOOTSTRAP_HEADER)).toBeNull();
  });

  it("does not add the bootstrap intent to direct markdown or internal asset fetches", async () => {
    window.history.replaceState({}, "", "/login");
    const fetchImpl = vi.fn(async () => new Response(""));
    let hostFetch: typeof fetch | null = null;

    const createHost = vi.fn((options: { fetchImpl: typeof fetch }) => {
      hostFetch = options.fetchImpl;
      return {
        subscribe: vi.fn(() => () => {}),
        submit: vi.fn(async () => {}),
        visit: vi.fn(async () => {}),
        sync: vi.fn(async (target?: string) => {
          await options.fetchImpl(target ?? "/");
        })
      };
    });
    const runtime = {
      mount: vi.fn(),
      unmount: vi.fn(),
      submit: vi.fn(async () => {}),
      visit: vi.fn(async () => {}),
      sync: vi.fn(async (target?: string) => {
        await hostFetch?.(target ?? "/");
      })
    };

    const booted = bootEntry({
      createHost: createHost as never,
      mountUi: vi.fn(() => runtime) as never,
      fetchImpl: fetchImpl as never
    });

    await Promise.resolve();
    await booted.runtime.sync("/search.md?q=hello");
    await booted.runtime.sync("/__mdan/entry.js");

    const markdownHeaders = fetchImpl.mock.calls[1]?.[1]?.headers as Headers | undefined;
    const assetHeaders = fetchImpl.mock.calls[2]?.[1]?.headers as Headers | undefined;

    expect(fetchImpl.mock.calls[1]?.[0]).toBe("/search.md?q=hello");
    expect(markdownHeaders?.get(BOOTSTRAP_HEADER) ?? null).toBeNull();
    expect(fetchImpl.mock.calls[2]?.[0]).toBe("/__mdan/entry.js");
    expect(assetHeaders?.get(BOOTSTRAP_HEADER) ?? null).toBeNull();
  });
});
