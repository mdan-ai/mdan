import { adaptReadableSurfaceToHeadlessSnapshot } from "./adapter.js";
import { parseReadableSurface, type ReadableSurface } from "./content.js";
import type { MdanHeadlessBlock, MdanOperation, MdanSubmitValues } from "./protocol-model.js";
import type {
  HeadlessDebugMessage,
  HeadlessListener,
  HeadlessRuntimeState,
  HeadlessSnapshot,
  MdanHeadlessHost
} from "./protocol.js";

export interface CreateHeadlessHostOptions {
  initialArtifact?: string;
  initialRoute?: string;
  fetchImpl?: typeof fetch;
  debugMessages?: boolean;
}

function serializeJsonBody(value: unknown): string {
  return JSON.stringify(value);
}

interface WindowWithMdanDebug extends Window {
  __MDAN_DEBUG__?: {
    messages: HeadlessDebugMessage[];
  };
}

function emptySnapshot(route?: string): HeadlessSnapshot {
  return {
    status: "idle",
    ...(route ? { route } : {}),
    markdown: "",
    blocks: []
  };
}

function replaceBlock(blocks: MdanHeadlessBlock[], nextBlock: MdanHeadlessBlock): MdanHeadlessBlock[] {
  let replaced = false;
  const next = blocks.map((block) => {
    if (block.name !== nextBlock.name) {
      return block;
    }
    replaced = true;
    return nextBlock;
  });
  if (!replaced) {
    next.push(nextBlock);
  }
  return next;
}

function resolveUpdatedRegions(operation?: MdanOperation): string[] {
  if (!operation || operation.stateEffect?.responseMode !== "region") {
    return [];
  }
  const updatedRegions = operation.stateEffect.updatedRegions;
  if (!Array.isArray(updatedRegions)) {
    return [];
  }
  return updatedRegions.filter((entry): entry is string => typeof entry === "string");
}

function patchSnapshotByRegions(
  current: HeadlessSnapshot,
  incoming: HeadlessSnapshot,
  updatedRegions: string[]
): HeadlessSnapshot | null {
  if (updatedRegions.length === 0) {
    return null;
  }
  if (incoming.route && current.route && incoming.route !== current.route) {
    return null;
  }

  const byName = new Map(incoming.blocks.map((block) => [block.name, block]));
  let nextBlocks = [...current.blocks];
  let patched = false;

  for (const region of updatedRegions) {
    const incomingBlock = byName.get(region);
    if (!incomingBlock) {
      continue;
    }
    nextBlocks = replaceBlock(nextBlocks, incomingBlock);
    patched = true;
  }

  if (!patched) {
    return null;
  }

  return {
    status: current.status,
    ...(current.route ? { route: current.route } : {}),
    ...(current.error ? { error: current.error } : {}),
    markdown: current.markdown,
    blocks: nextBlocks
  };
}

function toSnapshot(surface: ReadableSurface, current: HeadlessSnapshot | null): HeadlessSnapshot {
  const adapted = adaptReadableSurfaceToHeadlessSnapshot(surface);
  return {
    status: current?.status ?? "idle",
    ...(adapted.route ?? current?.route ? { route: adapted.route ?? current?.route } : {}),
    ...(current?.error ? { error: current.error } : {}),
    markdown: adapted.markdown,
    blocks: adapted.blocks
  };
}

function toGetUrl(target: string, operation: MdanOperation | undefined, values: MdanSubmitValues): string {
  const params = new URLSearchParams();
  if (typeof operation?.actionProof === "string" && operation.actionProof.length > 0) {
    params.set("action.proof", operation.actionProof);
  }
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") {
      params.set(key, value);
    } else if (typeof value === "number" || typeof value === "boolean") {
      params.set(key, String(value));
    } else if (value !== null && !(typeof File !== "undefined" && value instanceof File)) {
      params.set(key, JSON.stringify(value));
    }
  }
  const query = params.toString();
  return query ? `${target}?${query}` : target;
}

function hasFileValue(values: MdanSubmitValues): boolean {
  const hasFileCtor = typeof File !== "undefined";
  return hasFileCtor && Object.values(values).some((value) => value instanceof File);
}

function toFormValue(value: MdanSubmitValues[string]): string | File {
  if (typeof File !== "undefined" && value instanceof File) {
    return value;
  }
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

function buildSubmitBody(operation: MdanOperation, values: MdanSubmitValues): { body: string | FormData; multipart: boolean } {
  const actionProof = typeof operation.actionProof === "string" ? operation.actionProof : undefined;
  if (hasFileValue(values)) {
    const form = new FormData();
    if (actionProof) {
      form.set("action.proof", actionProof);
    }
    for (const [key, value] of Object.entries(values)) {
      form.set(key, toFormValue(value));
    }
    return { body: form, multipart: true };
  }

  if (!actionProof) {
    return { body: serializeJsonBody({ input: values }), multipart: false };
  }
  return {
    body: serializeJsonBody({
      action: {
        proof: actionProof
      },
      input: values
    }),
    multipart: false
  };
}

function pushHistory(target: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.history.pushState({}, "", target);
}

function isResponseOk(response: unknown): boolean {
  const candidate = response as { ok?: unknown; status?: unknown };
  if (typeof candidate.ok === "boolean") {
    return candidate.ok;
  }
  if (typeof candidate.status === "number") {
    return candidate.status >= 200 && candidate.status < 300;
  }
  return true;
}

function extractResponseErrorMessage(response: unknown, surface: ReadableSurface | null, fallbackContent: string): string {
  const candidate = response as { status?: unknown; statusText?: unknown };
  const status = typeof candidate.status === "number" ? candidate.status : undefined;
  const statusText = typeof candidate.statusText === "string" ? candidate.statusText.trim() : "";
  const content = surface ? adaptReadableSurfaceToHeadlessSnapshot(surface).markdown : fallbackContent;
  const firstLine = content
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  const parts = [
    status !== undefined ? `HTTP ${status}` : "HTTP request failed",
    statusText || undefined,
    firstLine || undefined
  ].filter(Boolean);
  return parts.join(": ");
}

export function createHeadlessHost(options: CreateHeadlessHostOptions = {}): MdanHeadlessHost {
  const fetchImpl = options.fetchImpl ?? fetch;
  const debugMessages = options.debugMessages === true;
  let mounted = false;
  const initialParsedArtifact = options.initialArtifact
    ? parseReadableSurface(options.initialArtifact, {
        fallbackRoute: options.initialRoute,
        allowBareMarkdown: true
      })
    : null;
  let snapshot = initialParsedArtifact
      ? toSnapshot(initialParsedArtifact, null)
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
    const next: HeadlessSnapshot = {
      status: status.status,
      markdown: snapshot.markdown,
      blocks: [...snapshot.blocks]
    };
    if (status.error) {
      next.error = status.error;
    }
    if (status.transition) {
      next.transition = status.transition;
    }
    if (snapshot.route) {
      next.route = snapshot.route;
    }

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
      url = toGetUrl(target, operation, values);
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
      const updatedRegions = resolveUpdatedRegions(operation);
      const patchedSnapshot =
        transition === "region" ? patchSnapshotByRegions(snapshot, nextSnapshot, updatedRegions) : null;
      snapshot = patchedSnapshot ?? nextSnapshot;
      const nextTransition = transition === "region" && !patchedSnapshot ? "page" : transition;
      if (snapshot.route && nextTransition === "page") {
        pushHistory(snapshot.route);
      }
      setStatus({ status: "idle", transition: nextTransition });
      recordDebugMessage({
        direction: "receive",
        method,
        url,
        markdown: surface.markdown
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
      listener({
        status: status.status,
        ...(status.error ? { error: status.error } : {}),
        ...(status.transition ? { transition: status.transition } : {}),
        ...(snapshot.route ? { route: snapshot.route } : {}),
        markdown: snapshot.markdown,
        blocks: [...snapshot.blocks]
      });
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
      const next: HeadlessSnapshot = {
        status: status.status,
        markdown: snapshot.markdown,
        blocks: [...snapshot.blocks]
      };
      if (status.error) {
        next.error = status.error;
      }
      if (status.transition) {
        next.transition = status.transition;
      }
      if (snapshot.route) {
        next.route = snapshot.route;
      }
      return next;
    }
  };
}
