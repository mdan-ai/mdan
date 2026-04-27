import { parseReadableSurface } from "./content.js";
import { buildGetActionUrl } from "../core/surface/forms.js";
import type { MdanOperation, MdanSubmitValues } from "../core/surface/presentation.js";
import type {
  HeadlessDebugMessage,
  HeadlessListener,
  HeadlessRuntimeState,
  HeadlessSnapshot,
  MdanHeadlessHost
} from "./contracts.js";
import {
  composeHeadlessSnapshot,
  emptySnapshot,
  patchSnapshotByOperationResult,
  toSnapshot
} from "./snapshot.js";
import {
  buildSubmitBody,
  extractResponseErrorMessage,
  isResponseOk
} from "./transport.js";

export interface CreateHeadlessHostOptions {
  initialMarkdown?: string;
  initialRoute?: string;
  fetchImpl?: typeof fetch;
  debugMessages?: boolean;
}

interface WindowWithMdanDebug extends Window {
  __MDAN_DEBUG__?: {
    messages: HeadlessDebugMessage[];
  };
}

function formatRegionPatchWarning(updatedRegions: string[], reason: "route-changed" | "missing-blocks"): string {
  if (reason === "route-changed") {
    return `[mdan] region response declared updated_regions ${JSON.stringify(updatedRegions)} but changed route, so the runtime fell back to a page transition.`;
  }
  return `[mdan] region response declared updated_regions ${JSON.stringify(updatedRegions)} but did not include matching blocks, so the runtime fell back to a page transition.`;
}

function pushHistory(target: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.history.pushState({}, "", target);
}

export function createHeadlessHost(options: CreateHeadlessHostOptions = {}): MdanHeadlessHost {
  const fetchImpl = options.fetchImpl ?? fetch;
  const debugMessages = options.debugMessages === true;
  let mounted = false;
  const initialParsedMarkdown = options.initialMarkdown
    ? parseReadableSurface(options.initialMarkdown, {
        fallbackRoute: options.initialRoute,
        allowBareMarkdown: true
      })
    : null;
  let snapshot = initialParsedMarkdown
      ? toSnapshot(initialParsedMarkdown, null)
      : emptySnapshot(options.initialRoute);
  let status: HeadlessRuntimeState = { status: "idle", transition: "page" };
  const listeners = new Set<HeadlessListener>();

  function recordDebugMessage(message: HeadlessDebugMessage): void {
    if (!debugMessages) {
      return;
    }
    if (typeof window !== "undefined") {
      const debugWindow = window as WindowWithMdanDebug;
      debugWindow.__MDAN_DEBUG__ ??= { messages: [] };
      debugWindow.__MDAN_DEBUG__.messages.push(message);
    }
    console.info("[mdan]", message);
  }

  function publish(): void {
    const next = composeHeadlessSnapshot(snapshot, status);

    for (const listener of listeners) {
      listener(next);
    }
  }

  function setStatus(next: HeadlessRuntimeState): void {
    status = next;
    publish();
  }

  async function load(target: string, operation?: MdanOperation, values: MdanSubmitValues = {}): Promise<void> {
    const method = operation?.method ?? "GET";
    const transition = operation?.stateEffect?.responseMode === "region" ? "region" : "page";
    setStatus({ status: "loading", transition });

    const headers = new Headers({ Accept: "text/markdown" });
    let url = target;
    let body: string | FormData | undefined;

    if (method === "GET") {
      url = buildGetActionUrl(target, operation, values);
    } else {
      const submitBody = buildSubmitBody(operation!, values);
      body = submitBody.body;
      if (!submitBody.multipart) {
        headers.set("Content-Type", "application/json");
      }
    }

    recordDebugMessage({
      direction: "send",
      method,
      url,
      markdown: JSON.stringify(values, null, 2)
    });

    try {
      const response = await fetchImpl(url, {
        method,
        headers,
        ...(body ? { body } : {})
      });
      const text = await response.text();
      const surface = parseReadableSurface(text, {
        ...(method === "GET" ? { fallbackRoute: target } : {}),
        allowBareMarkdown: true
      });

      if (!isResponseOk(response)) {
        const errorMessage = extractResponseErrorMessage(response, surface, text);
        if (surface) {
          snapshot = toSnapshot(surface, snapshot);
        }
        setStatus({ status: "error", transition, error: errorMessage });
        recordDebugMessage({
          direction: "receive",
          method,
          url,
          markdown: surface?.markdown ?? text
        });
        return;
      }

      if (!surface) {
        setStatus({ status: "error", transition, error: "Runtime returned an unreadable response." });
        recordDebugMessage({
          direction: "receive",
          method,
          url,
          markdown: text
        });
        return;
      }

      const nextSnapshot = toSnapshot(surface, snapshot);
      const patchResult =
        transition === "region"
          ? patchSnapshotByOperationResult(snapshot, nextSnapshot, operation)
          : {
              snapshot: null,
              updatedRegions: [],
              patchApplied: false
            };
      const patchedSnapshot = patchResult.snapshot;
      snapshot = patchedSnapshot ?? nextSnapshot;
      const nextTransition = transition === "region" && !patchedSnapshot ? "page" : transition;
      if (debugMessages && transition === "region" && !patchResult.patchApplied && patchResult.fallbackReason) {
        console.warn(formatRegionPatchWarning(patchResult.updatedRegions, patchResult.fallbackReason));
      }
      if (snapshot.route && nextTransition === "page") {
        pushHistory(snapshot.route);
      }
      setStatus({ status: "idle", transition: nextTransition });
      recordDebugMessage({
        direction: "receive",
        method,
        url,
        markdown: surface.markdown,
        transition,
        ...(patchResult.updatedRegions.length > 0 ? { updatedRegions: patchResult.updatedRegions } : {}),
        ...(transition === "region" ? { patchApplied: patchResult.patchApplied } : {}),
        ...(transition === "region" && !patchResult.patchApplied ? { fallbackTransition: nextTransition } : {}),
        ...(transition === "region" && patchResult.fallbackReason ? { patchFallbackReason: patchResult.fallbackReason } : {}),
        requestedRoute: target,
        ...(snapshot.route ? { resolvedRoute: snapshot.route } : {})
      });
    } catch (error) {
      setStatus({
        status: "error",
        transition,
        error: error instanceof Error ? error.message : "Unexpected runtime error."
      });
    }
  }

  function mount(): void {
    if (mounted || typeof window === "undefined") {
      mounted = true;
      publish();
      return;
    }
    mounted = true;
    window.addEventListener("popstate", onPopState);
    publish();
  }

  function unmount(): void {
    if (!mounted || typeof window === "undefined") {
      mounted = false;
      return;
    }
    mounted = false;
    window.removeEventListener("popstate", onPopState);
  }

  function onPopState(): void {
    void load(window.location.pathname + window.location.search);
  }

  return {
    mount,
    unmount,
    subscribe(listener: HeadlessListener) {
      listeners.add(listener);
      listener(composeHeadlessSnapshot(snapshot, status));
      return () => {
        listeners.delete(listener);
      };
    },
    async submit(operation: MdanOperation, values: MdanSubmitValues = {}) {
      await load(operation.target, operation, values);
    },
    async visit(target: string) {
      await load(target);
    },
    async sync(target?: string) {
      const nextTarget =
        target ??
        snapshot.route ??
        options.initialRoute ??
        (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");
      await load(nextTarget);
    },
    getSnapshot(): HeadlessSnapshot {
      return composeHeadlessSnapshot(snapshot, status);
    }
  };
}
