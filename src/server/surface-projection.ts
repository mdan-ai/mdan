import type { JsonSurfaceEnvelope } from "../protocol/surface.js";
import type { MdanPage } from "../protocol/types.js";
import { adaptJsonEnvelopeToMdanPage } from "../surface/adapter.js";
import { renderSurfaceSnapshot as renderWebSurfaceSnapshot } from "../surface/snapshot.js";

export function projectJsonSurfaceToPage(surface: JsonSurfaceEnvelope): MdanPage {
  return adaptJsonEnvelopeToMdanPage(surface);
}

export function renderSurfaceSnapshot(surface: JsonSurfaceEnvelope | undefined): string {
  return renderWebSurfaceSnapshot(surface);
}
