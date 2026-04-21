import { createHash } from "node:crypto";

import type { ReadableSurface } from "./artifact.js";

function routeStateSegment(route: string | undefined): string {
  const normalized = (route ?? "/")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "home";
}

function deriveStateVersion(surface: ReadableSurface): number {
  const payload = JSON.stringify({
    markdown: surface.markdown,
    route: surface.route ?? "",
    regions: surface.regions ?? {},
    actions: {
      ...surface.actions,
      state_id: undefined,
      state_version: undefined
    }
  });
  const digest = createHash("sha1").update(payload).digest();
  const version = digest.readUInt32BE(0) % 2147483647;
  return version > 0 ? version : 1;
}

export function normalizeReadableSurface(
  surface: ReadableSurface,
  fallbackAppId?: string
): ReadableSurface {
  const appId =
    typeof surface.actions.app_id === "string" && surface.actions.app_id.trim().length > 0
      ? surface.actions.app_id.trim()
      : typeof fallbackAppId === "string" && fallbackAppId.trim().length > 0
        ? fallbackAppId.trim()
        : "";
  if (!appId) {
    return surface;
  }

  const stateId =
    typeof surface.actions.state_id === "string" && surface.actions.state_id.trim().length > 0
      ? surface.actions.state_id
      : `${appId}:${routeStateSegment(surface.route)}`;
  const stateVersion =
    typeof surface.actions.state_version === "number" && Number.isFinite(surface.actions.state_version)
      ? surface.actions.state_version
      : deriveStateVersion(surface);

  if (
    appId === surface.actions.app_id &&
    stateId === surface.actions.state_id &&
    stateVersion === surface.actions.state_version
  ) {
    return surface;
  }

  return {
    ...surface,
    actions: {
      ...surface.actions,
      app_id: appId,
      state_id: stateId,
      state_version: stateVersion
    }
  };
}
