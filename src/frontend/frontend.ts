import {
  autoBootEntry,
  bootEntry,
  type BootEntryOptions,
  type BootedEntry
} from "./entry.js";
import {
  resolveFrontendExtension,
  type MdanFrontendExtension,
  type ResolvedFrontendExtension
} from "./extension.js";
import {
  mountMdanUi,
  type MdanUiRuntime,
  type MountMdanUiOptions
} from "./mount.js";
import {
  renderSurfaceSnapshot,
  type RenderSurfaceSnapshotOptions
} from "./snapshot.js";
import type { UiSnapshotView } from "./model.js";

export interface MdanFrontend extends ResolvedFrontendExtension {
  boot(options?: Omit<BootEntryOptions, "frontend">): BootedEntry;
  autoBoot(options?: Omit<BootEntryOptions, "frontend">): BootedEntry | null;
  mount(options: Omit<MountMdanUiOptions, "frontend">): MdanUiRuntime;
  render(
    view: UiSnapshotView | undefined,
    options?: Omit<RenderSurfaceSnapshotOptions, "frontend" | "markdownRenderer" | "formRenderer">
  ): string;
}

export function createFrontend(extension: MdanFrontendExtension = {}): MdanFrontend {
  const resolved = resolveFrontendExtension({ frontend: extension });

  return {
    ...resolved,
    boot(options = {}) {
      return bootEntry({
        ...options,
        frontend: resolved
      });
    },
    autoBoot(options = {}) {
      return autoBootEntry({
        ...options,
        frontend: resolved
      });
    },
    mount(options) {
      return mountMdanUi({
        ...options,
        frontend: resolved
      });
    },
    render(view, options = {}) {
      return renderSurfaceSnapshot(view, {
        ...options,
        frontend: resolved
      });
    }
  };
}
