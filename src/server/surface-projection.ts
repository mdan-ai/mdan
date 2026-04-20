import type { MdanPage } from "../protocol/types.js";
import { adaptReadableSurfaceToMdanPage } from "../surface/adapter.js";
import {
  renderSurfaceSnapshot as renderWebSurfaceSnapshot,
  type RenderSurfaceSnapshotOptions
} from "../surface/snapshot.js";
import {
  artifactMarkdownRenderer,
  serializeArtifactPage,
  type ReadableSurface
} from "./artifact.js";

export type { RenderSurfaceSnapshotOptions };
export type { ReadableSurface as ProjectableReadableSurface } from "./artifact.js";

export function isProjectableReadableSurface(value: unknown): value is ReadableSurface {
  if (!value || typeof value !== "object") {
    return false;
  }
  return typeof (value as ReadableSurface).markdown === "string" && typeof (value as ReadableSurface).actions === "object";
}

export function projectReadableSurfaceToPage(surface: ReadableSurface): MdanPage {
  return adaptReadableSurfaceToMdanPage(surface);
}

export function renderSurfaceSnapshot(
  surface: ReadableSurface | undefined,
  options?: RenderSurfaceSnapshotOptions
): string {
  return renderWebSurfaceSnapshot(surface, options);
}

export function renderInitialProjection(
  initialPage: MdanPage | undefined,
  initialReadableSurface: ReadableSurface | undefined,
  options: RenderSurfaceSnapshotOptions = {}
): string {
  if (initialPage) {
    const renderer = options.markdownRenderer ?? artifactMarkdownRenderer;
    return renderer.render(serializeArtifactPage(initialPage));
  }
  return renderSurfaceSnapshot(initialReadableSurface, options);
}
