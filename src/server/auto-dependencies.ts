import type { MdanBlock, MdanFragment, MdanOperation, MdanPage } from "../protocol/types.js";

import { dispatchGetRoute } from "./handler-dispatch.js";
import type { MdanAssetStoreOptions } from "./assets.js";
import { MdanRouter } from "./router.js";
import type { MdanActionResult, MdanRequest, MdanSessionSnapshot } from "./types.js";

export interface AutoDependencyOptions {
  maxPasses?: number;
}

const DEFAULT_MAX_AUTO_DEPENDENCY_PASSES = 10;

function resolveMaxPasses(options: AutoDependencyOptions = {}): number {
  if (typeof options.maxPasses !== "number" || !Number.isFinite(options.maxPasses)) {
    return DEFAULT_MAX_AUTO_DEPENDENCY_PASSES;
  }
  return Math.max(0, Math.floor(options.maxPasses));
}

function isAutoDependency(operation: MdanOperation): boolean {
  return operation.method === "GET" && operation.auto === true;
}

function applySessionMutation(
  session: MdanSessionSnapshot | null,
  mutation: MdanActionResult["session"] | undefined
): MdanSessionSnapshot | null {
  if (!mutation) {
    return session;
  }

  if (mutation.type === "sign-out") {
    return null;
  }

  return mutation.session;
}

function mergePreferredMetadata(
  preferred: Pick<MdanActionResult, "status" | "route" | "headers" | "session">,
  fallback?: Pick<MdanActionResult, "status" | "route" | "headers" | "session">
): Pick<MdanActionResult, "status" | "route" | "headers" | "session"> {
  return {
    ...(preferred.status !== undefined
      ? { status: preferred.status }
      : fallback?.status !== undefined
        ? { status: fallback.status }
        : {}),
    ...(preferred.route
      ? { route: preferred.route }
      : fallback?.route
        ? { route: fallback.route }
        : {}),
    ...(preferred.headers
      ? { headers: preferred.headers }
      : fallback?.headers
        ? { headers: fallback.headers }
        : {}),
    ...(preferred.session
      ? { session: preferred.session }
      : fallback?.session
        ? { session: fallback.session }
        : {})
  };
}

function buildActionResult(
  page: MdanPage,
  metadata: Pick<MdanActionResult, "status" | "route" | "headers" | "session">
): MdanActionResult {
  return {
    ...metadata,
    page
  };
}

function currentResultMetadata(
  status: number | undefined,
  route: string | undefined,
  headers: Record<string, string> | undefined,
  session: MdanActionResult["session"] | undefined
): Pick<MdanActionResult, "status" | "route" | "headers" | "session"> {
  return {
    ...(status !== undefined ? { status } : {}),
    ...(route ? { route } : {}),
    ...(headers ? { headers } : {}),
    ...(session ? { session } : {})
  };
}

function mergeResolvedMetadata(
  current: Pick<MdanActionResult, "status" | "route" | "headers" | "session">,
  resolved?: Pick<MdanActionResult, "status" | "route" | "headers" | "session">
): Pick<MdanActionResult, "status" | "route" | "headers" | "session"> {
  return mergePreferredMetadata(resolved ?? {}, current);
}

interface AutoDependencyResolutionState {
  session: MdanSessionSnapshot | null;
  mutation?: MdanActionResult["session"];
  route?: string;
  status?: number;
  headers?: Record<string, string>;
}

function applyResolvedResultState(
  state: AutoDependencyResolutionState,
  result: Pick<MdanActionResult, "status" | "route" | "headers" | "session">
): AutoDependencyResolutionState {
  return {
    session: applySessionMutation(state.session, result.session),
    ...(result.session ? { mutation: result.session } : state.mutation ? { mutation: state.mutation } : {}),
    ...(result.route ? { route: result.route } : state.route ? { route: state.route } : {}),
    ...(result.status !== undefined ? { status: result.status } : state.status !== undefined ? { status: state.status } : {}),
    ...(result.headers ? { headers: result.headers } : state.headers ? { headers: state.headers } : {})
  };
}

function stateResultMetadata(
  state: AutoDependencyResolutionState
): Pick<MdanActionResult, "status" | "route" | "headers" | "session"> {
  return currentResultMetadata(state.status, state.route, state.headers, state.mutation);
}

function applyResolvedPageResult(
  current: MdanActionResult,
  resolved: MdanActionResult,
  resolvedPage: MdanActionResult
): MdanActionResult {
  return {
    ...current,
    ...mergeResolvedMetadata(
      {
        ...current,
        ...mergeResolvedMetadata(current, resolved)
      },
      resolvedPage
    ),
    page: resolvedPage.page
  };
}

function applyResolvedFragmentResult(
  current: MdanActionResult,
  resolved: MdanActionResult
): MdanActionResult {
  return {
    ...current,
    ...mergeResolvedMetadata(current, resolved),
    fragment: resolved.fragment,
  };
}

function createImplicitGetRequest(target: string, request: MdanRequest): MdanRequest {
  const targetUrl = new URL(target, request.url);
  return {
    ...request,
    method: "GET",
    url: targetUrl.toString(),
    headers: {
      ...request.headers,
      accept: "text/markdown"
    },
    query: Object.fromEntries(targetUrl.searchParams.entries())
  };
}

function applyImplicitFragmentToPage(
  page: MdanPage,
  blockName: string,
  operation: MdanOperation,
  fragment: MdanFragment
): MdanPage {
  const existingBlock = page.blocks.find((block) => block.name === blockName);
  const returnedBlock = fragment.blocks.find((block) => block.name === blockName) ?? fragment.blocks[0];
  const nextBlock =
    returnedBlock ??
    (existingBlock
      ? {
          ...existingBlock,
          operations: existingBlock.operations.filter((entry) => entry !== operation)
        }
      : undefined);

  return {
    ...page,
    blocks: page.blocks.map((block) => (block.name === blockName && nextBlock ? nextBlock : block)),
    blockContent: {
      ...(page.blockContent ?? {}),
      [blockName]: fragment.markdown
    }
  };
}

async function resolveAutoTarget(
  target: string,
  request: MdanRequest,
  session: MdanSessionSnapshot | null,
  router: MdanRouter,
  assetOptions: MdanAssetStoreOptions,
  fallbackAppId?: string
): Promise<MdanActionResult | null> {
  const implicitRequest = createImplicitGetRequest(target, request);
  return dispatchGetRoute(
    router,
    implicitRequest,
    session,
    assetOptions,
    { appId: fallbackAppId }
  );
}

function findAutoDependency(blocks: MdanBlock[]): { blockName: string; operation: MdanOperation } | null {
  for (const block of blocks) {
    const operation = block.operations.find(isAutoDependency);
    if (operation) {
      return {
        blockName: block.name,
        operation
      };
    }
  }

  return null;
}

export async function resolveAutoDependencies(
  page: MdanPage,
  request: MdanRequest,
  session: MdanSessionSnapshot | null,
  router: MdanRouter,
  assetOptions: MdanAssetStoreOptions,
  options: AutoDependencyOptions = {},
  fallbackAppId?: string
): Promise<MdanActionResult> {
  let currentPage = page;
  let state: AutoDependencyResolutionState = {
    session
  };
  const maxPasses = resolveMaxPasses(options);

  for (let pass = 0; pass < maxPasses; pass += 1) {
    let resolved = false;

    for (const block of currentPage.blocks) {
      const operation = block.operations.find(isAutoDependency);
      if (!operation) {
        continue;
      }

      const result = await resolveAutoTarget(operation.target, request, state.session, router, assetOptions, fallbackAppId);
      if (!result) {
        continue;
      }

      state = applyResolvedResultState(state, result);

      if (result.page) {
        currentPage = result.page;
      } else if (result.fragment) {
        currentPage = applyImplicitFragmentToPage(currentPage, block.name, operation, result.fragment);
      } else {
        continue;
      }

      resolved = true;
      break;
    }

    if (!resolved) {
      return buildActionResult(
        currentPage,
        stateResultMetadata(state)
      );
    }
  }

  return buildActionResult(
    currentPage,
    stateResultMetadata(state)
  );
}

export async function resolveAutoActionResult(
  result: MdanActionResult,
  request: MdanRequest,
  session: MdanSessionSnapshot | null,
  router: MdanRouter,
  assetOptions: MdanAssetStoreOptions,
  options: AutoDependencyOptions = {},
  fallbackAppId?: string
): Promise<MdanActionResult> {
  if (result.page) {
    const resolvedPage = await resolveAutoDependencies(result.page, request, session, router, assetOptions, options, fallbackAppId);
    return {
      ...result,
      ...mergeResolvedMetadata(result, resolvedPage),
      page: resolvedPage.page
    };
  }

  if (!result.fragment) {
    return result;
  }

  let current = result;
  const maxPasses = resolveMaxPasses(options);

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const currentSession = applySessionMutation(session, current.session);
    const dependency = findAutoDependency(current.fragment?.blocks ?? []);
    if (!dependency) {
      return current;
    }

    const resolved = await resolveAutoTarget(dependency.operation.target, request, currentSession, router, assetOptions, fallbackAppId);
    if (!resolved) {
      return current;
    }

    if (resolved.page) {
      const resolvedPage = await resolveAutoDependencies(
        resolved.page,
        request,
        currentSession,
        router,
        assetOptions,
        options,
        fallbackAppId
      );
      return applyResolvedPageResult(current, resolved, resolvedPage);
    }

    if (resolved.fragment) {
      current = applyResolvedFragmentResult(current, resolved);
      continue;
    }

    return current;
  }

  return current;
}
