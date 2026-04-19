import type { MdanBlock, MdanFragment, MdanOperation, MdanPage } from "../protocol/types.js";

import { openAssetStream as openStoredAssetStream, readAsset as readStoredAsset, type MdanAssetStoreOptions } from "./assets.js";
import { MdanRouter } from "./router.js";
import { normalizeActionHandlerResult, normalizePageHandlerResult } from "./result-normalization.js";
import type { MdanActionResult, MdanRequest, MdanSessionSnapshot } from "./types.js";

export interface AutoPageResolution {
  page: MdanPage;
  route?: string;
  session?: MdanActionResult["session"];
}

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

function getPathname(request: MdanRequest): string {
  return new URL(request.url).pathname;
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
  assetOptions: MdanAssetStoreOptions
): Promise<MdanActionResult | null> {
  const implicitRequest = createImplicitGetRequest(target, request);
  const pathname = getPathname(implicitRequest);
  const pageHandler = router.resolvePage(pathname);

  if (pageHandler) {
    const pageResult = await pageHandler.handler({
      request: implicitRequest,
      session,
      params: pageHandler.params
    });
    const normalizedPageResult = normalizePageHandlerResult(pageResult);
    const page = normalizedPageResult.page;

    if (!page) {
      return null;
    }

    return {
      status: 200,
      route: normalizedPageResult.route ?? pathname,
      page
    };
  }

  const match = router.resolve("GET", pathname);
  if (!match) {
    return null;
  }

  const resultLike = await match.handler({
    request: implicitRequest,
    inputs: Object.fromEntries(new URL(implicitRequest.url).searchParams.entries()),
    inputsRaw: Object.fromEntries(new URL(implicitRequest.url).searchParams.entries()),
    session,
    params: match.params,
    readAsset(assetId: string) {
      return readStoredAsset(assetId, assetOptions);
    },
    openAssetStream(assetId: string) {
      return openStoredAssetStream(assetId, assetOptions);
    }
  });
  if ("stream" in resultLike) {
    return null;
  }
  return normalizeActionHandlerResult(resultLike);
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
  options: AutoDependencyOptions = {}
): Promise<AutoPageResolution> {
  let currentPage = page;
  let currentSession = session;
  let currentMutation: MdanActionResult["session"] | undefined;
  let currentRoute: string | undefined;
  const maxPasses = resolveMaxPasses(options);

  for (let pass = 0; pass < maxPasses; pass += 1) {
    let resolved = false;

    for (const block of currentPage.blocks) {
      const operation = block.operations.find(isAutoDependency);
      if (!operation) {
        continue;
      }

      const result = await resolveAutoTarget(operation.target, request, currentSession, router, assetOptions);
      if (!result) {
        continue;
      }

      currentSession = applySessionMutation(currentSession, result.session);
      if (result.session) {
        currentMutation = result.session;
      }
      if (result.route) {
        currentRoute = result.route;
      }

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
      return {
        page: currentPage,
        ...(currentRoute ? { route: currentRoute } : {}),
        ...(currentMutation ? { session: currentMutation } : {})
      };
    }
  }

  return {
    page: currentPage,
    ...(currentRoute ? { route: currentRoute } : {}),
    ...(currentMutation ? { session: currentMutation } : {})
  };
}

export async function resolveAutoActionResult(
  result: MdanActionResult,
  request: MdanRequest,
  session: MdanSessionSnapshot | null,
  router: MdanRouter,
  assetOptions: MdanAssetStoreOptions,
  options: AutoDependencyOptions = {}
): Promise<MdanActionResult> {
  if (result.page) {
    const resolvedPage = await resolveAutoDependencies(result.page, request, session, router, assetOptions, options);
    return {
      ...result,
      ...(resolvedPage.route ? { route: resolvedPage.route } : result.route ? { route: result.route } : {}),
      ...(resolvedPage.session ? { session: resolvedPage.session } : {}),
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

    const resolved = await resolveAutoTarget(dependency.operation.target, request, currentSession, router, assetOptions);
    if (!resolved) {
      return current;
    }

    if (resolved.page) {
      const resolvedPage = await resolveAutoDependencies(resolved.page, request, currentSession, router, assetOptions, options);
      return {
        ...current,
        ...(resolvedPage.session ? { session: resolvedPage.session } : resolved.session ? { session: resolved.session } : {}),
        ...(resolvedPage.route
          ? { route: resolvedPage.route }
          : resolved.route
            ? { route: resolved.route }
            : current.route
              ? { route: current.route }
              : {}),
        page: resolvedPage.page
      };
    }

    if (resolved.fragment) {
      current = {
        ...current,
        ...(resolved.route ? { route: resolved.route } : current.route ? { route: current.route } : {}),
        fragment: resolved.fragment,
        ...(resolved.session ? { session: resolved.session } : {})
      };
      continue;
    }

    return current;
  }

  return current;
}
