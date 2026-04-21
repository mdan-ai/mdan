import { openAssetStream as openStoredAssetStream, readAsset as readStoredAsset, type MdanAssetStoreOptions } from "./assets.js";
import type { ReadableSurfaceValidationOptions } from "./readable-surface-options.js";
import { getReadableSurfaceViolation } from "./readable-surface-validation.js";
import {
  normalizeActionHandlerResultLike,
  normalizePageHandlerResult,
  type NormalizedActionHandlerResult,
  type NormalizedPageResult,
  pageResultToActionResult
} from "./result-normalization.js";
import { MdanRouter } from "./router.js";
import type {
  MdanActionResult,
  MdanHandler,
  MdanInputMap,
  MdanPageHandler,
  MdanRequest,
  MdanSessionSnapshot
} from "./types.js";

export async function dispatchPageHandler(
  handler: MdanPageHandler,
  request: MdanRequest,
  session: MdanSessionSnapshot | null,
  params: Record<string, string>,
  fallbackAppId?: string
): Promise<NormalizedPageResult> {
  return normalizePageHandlerResult(
    await handler({
      request,
      session,
      params
    }),
    fallbackAppId
  );
}

export async function dispatchGetRoute(
  router: MdanRouter,
  request: MdanRequest,
  session: MdanSessionSnapshot | null,
  assetOptions: MdanAssetStoreOptions,
  validationOptions: ReadableSurfaceValidationOptions
): Promise<MdanActionResult | null> {
  const pathname = new URL(request.url).pathname;
  const pageHandler = router.resolvePage(pathname);

  if (pageHandler) {
    return pageResultToActionResult(
      await dispatchPageHandler(
        pageHandler.handler,
        request,
        session,
        pageHandler.params,
        validationOptions.appId
      ),
      pathname
    );
  }

  const match = router.resolve("GET", pathname);
  if (!match) {
    return null;
  }

  const inputs = Object.fromEntries(new URL(request.url).searchParams.entries());
  const normalizedResult = await dispatchActionHandler(
    match.handler,
    request,
    session,
    match.params,
    inputs,
    inputs,
    assetOptions,
    validationOptions.appId
  );
  if (normalizedResult.stream) {
    return null;
  }
  if (normalizedResult.surface) {
    const violation = getReadableSurfaceViolation(normalizedResult.surface, validationOptions);
    if (violation) {
      const detail =
        violation.kind === "actions"
          ? violation.detail
          : violation.errors.join("; ");
      throw new Error(
        violation.kind === "actions"
          ? `invalid actions contract: ${detail}`
          : detail
      );
    }
  }
  if (!normalizedResult.action) {
    throw new TypeError("dispatchGetRoute cannot resolve invalid action handler results.");
  }
  return normalizedResult.action;
}

export async function dispatchActionHandler(
  handler: MdanHandler,
  request: MdanRequest,
  session: MdanSessionSnapshot | null,
  params: Record<string, string>,
  inputs: Record<string, unknown>,
  inputsRaw: Record<string, unknown>,
  assetOptions: MdanAssetStoreOptions,
  fallbackAppId?: string
): Promise<NormalizedActionHandlerResult> {
  return normalizeActionHandlerResultLike(
    await handler({
      request,
      inputs: inputs as MdanInputMap,
      inputsRaw,
      session,
      params,
      readAsset(assetId: string) {
        return readStoredAsset(assetId, assetOptions);
      },
      openAssetStream(assetId: string) {
        return openStoredAssetStream(assetId, assetOptions);
      }
    }),
    fallbackAppId
  );
}
