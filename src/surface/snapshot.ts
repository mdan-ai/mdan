import { adaptReadableSurfaceToHeadlessSnapshot } from "./adapter.js";
import type { ReadableSurface } from "./content.js";
import type { HeadlessRuntimeState, HeadlessSnapshot } from "./contracts.js";
import type { MdanHeadlessBlock, MdanOperation } from "../core/surface/presentation.js";

export interface RegionPatchResult {
  snapshot: HeadlessSnapshot | null;
  updatedRegions: string[];
  patchApplied: boolean;
  fallbackReason?: "route-changed" | "missing-blocks";
}

export function emptySnapshot(route?: string): HeadlessSnapshot {
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

export function patchSnapshotByOperationResult(
  current: HeadlessSnapshot,
  incoming: HeadlessSnapshot,
  operation?: MdanOperation
): RegionPatchResult {
  const updatedRegions = resolveUpdatedRegions(operation);
  if (updatedRegions.length === 0) {
    return {
      snapshot: null,
      updatedRegions,
      patchApplied: false
    };
  }
  if (incoming.route && current.route && incoming.route !== current.route) {
    return {
      snapshot: null,
      updatedRegions,
      patchApplied: false,
      fallbackReason: "route-changed"
    };
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
    return {
      snapshot: null,
      updatedRegions,
      patchApplied: false,
      fallbackReason: "missing-blocks"
    };
  }

  return {
    snapshot: {
      status: current.status,
      ...(current.route ? { route: current.route } : {}),
      ...(current.error ? { error: current.error } : {}),
      markdown: current.markdown,
      blocks: nextBlocks
    },
    updatedRegions,
    patchApplied: true
  };
}

export function patchSnapshotByOperation(
  current: HeadlessSnapshot,
  incoming: HeadlessSnapshot,
  operation?: MdanOperation
): HeadlessSnapshot | null {
  return patchSnapshotByOperationResult(current, incoming, operation).snapshot;
}

export function toSnapshot(surface: ReadableSurface, current: HeadlessSnapshot | null): HeadlessSnapshot {
  const adapted = adaptReadableSurfaceToHeadlessSnapshot(surface);
  return {
    status: current?.status ?? "idle",
    ...(adapted.route ?? current?.route ? { route: adapted.route ?? current?.route } : {}),
    ...(current?.error ? { error: current.error } : {}),
    markdown: adapted.markdown,
    blocks: adapted.blocks
  };
}

export function composeHeadlessSnapshot(
  snapshot: Pick<HeadlessSnapshot, "markdown" | "blocks" | "route">,
  status: HeadlessRuntimeState
): HeadlessSnapshot {
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
