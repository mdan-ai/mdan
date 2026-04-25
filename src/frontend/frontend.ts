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

const FRONTEND_MODULE_SYMBOL = Symbol.for("mdan.frontend.module");

interface FrontendModuleDefinition {
  exportName: string;
  moduleUrl: string;
}

export interface MdanFrontendModuleTagged extends MdanFrontend {
  [FRONTEND_MODULE_SYMBOL]: FrontendModuleDefinition;
}

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

export function defineFrontendModule(
  moduleUrl: string,
  frontend: MdanFrontend,
  exportName = "default"
): MdanFrontendModuleTagged {
  Object.defineProperty(frontend, FRONTEND_MODULE_SYMBOL, {
    value: {
      moduleUrl,
      exportName
    } satisfies FrontendModuleDefinition,
    enumerable: false,
    configurable: true
  });

  return frontend as MdanFrontendModuleTagged;
}
