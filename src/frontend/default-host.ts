import { createHeadlessHost } from "../surface/index.js";
import { adaptReadableSurfaceToHeadlessSnapshot } from "../core/surface/readable.js";

import type { CreateFrontendHostOptions, FrontendHostFactory } from "./contracts.js";

function toHeadlessHostOptions(options: CreateFrontendHostOptions): Parameters<typeof createHeadlessHost>[0] {
  const { initialActions, browserProjection: _browserProjection, ...headlessOptions } = options;
  if (!initialActions) {
    return headlessOptions;
  }

  return {
    ...headlessOptions,
    initialSnapshot: adaptReadableSurfaceToHeadlessSnapshot({
      markdown: "",
      actions: initialActions,
      ...(options.initialRoute ? { route: options.initialRoute } : {})
    })
  };
}

export const createDefaultFrontendHost: FrontendHostFactory = (options) =>
  createHeadlessHost(toHeadlessHostOptions(options));
