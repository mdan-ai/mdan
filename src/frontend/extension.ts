import { defaultUiFormRenderer, type UiFormRenderer } from "./form-renderer.js";
import { basicMarkdownRenderer, type MdanMarkdownRenderer } from "./model.js";
import type { FrontendSnapshot, FrontendUiHost } from "./contracts.js";
import type { MdanUiRuntime } from "./mount.js";

export type { MdanMarkdownRenderer } from "./model.js";

export type MdanFrontendSetupCleanup = () => void | Promise<void>;

export interface MdanFrontendSetupContext {
  runtime: MdanUiRuntime;
  host: FrontendUiHost;
  root: ParentNode;
  route?: string;
  browserProjection?: "client" | "html";
  window?: Window;
}

export interface MdanFrontendExtension {
  markdown?: MdanMarkdownRenderer;
  form?: UiFormRenderer;
  setup?: (context: MdanFrontendSetupContext) =>
    | void
    | MdanFrontendSetupCleanup
    | Promise<void | MdanFrontendSetupCleanup>;
}

export interface ResolveFrontendExtensionOptions {
  frontend?: MdanFrontendExtension;
  markdownRenderer?: MdanMarkdownRenderer;
  formRenderer?: UiFormRenderer;
}

export interface ResolvedFrontendExtension {
  markdown: MdanMarkdownRenderer;
  form: UiFormRenderer;
  setup?: MdanFrontendExtension["setup"];
}

export function resolveFrontendExtension(
  options: ResolveFrontendExtensionOptions = {}
): ResolvedFrontendExtension {
  return {
    markdown: options.frontend?.markdown ?? options.markdownRenderer ?? basicMarkdownRenderer,
    form: options.frontend?.form ?? options.formRenderer ?? defaultUiFormRenderer,
    ...(options.frontend?.setup ? { setup: options.frontend.setup } : {})
  };
}

export function getFrontendSetupRoute(host: FrontendUiHost): string | undefined {
  const maybeSnapshotHost = host as FrontendUiHost & {
    getSnapshot?: () => FrontendSnapshot;
  };
  return maybeSnapshotHost.getSnapshot?.().route;
}

export function attachFrontendSetup(
  runtime: MdanUiRuntime,
  frontend: ResolvedFrontendExtension,
  context: Omit<MdanFrontendSetupContext, "runtime">
): MdanUiRuntime {
  if (!frontend.setup) {
    return runtime;
  }

  let mounted = false;
  let token = 0;
  let cleanup: MdanFrontendSetupCleanup | null = null;
  let cleanupStarted = false;

  const wrapped: MdanUiRuntime = {
    mount() {
      runtime.mount();
      if (mounted) {
        return;
      }
      mounted = true;
      token += 1;
      const setupToken = token;
      cleanup = null;
      cleanupStarted = false;
      let setupResult: ReturnType<NonNullable<ResolvedFrontendExtension["setup"]>>;
      try {
        setupResult = frontend.setup?.({
          ...context,
          runtime: wrapped
        });
      } catch (error) {
        handleSetupError(error);
        return;
      }

      if (typeof setupResult === "function") {
        cleanup = setupResult;
        return;
      }

      void Promise.resolve(setupResult).then(
        (resolvedCleanup) => {
          if (typeof resolvedCleanup !== "function") {
            return;
          }
          if (setupToken !== token) {
            void Promise.resolve(resolvedCleanup()).catch((error: unknown) => {
              console.error("[mdan] frontend setup cleanup failed", error);
            });
            return;
          }
          cleanup = resolvedCleanup;
          if (!mounted) {
            runCleanup();
          }
        },
        (error: unknown) => {
          handleSetupError(error);
        }
      );
    },
    unmount() {
      if (mounted) {
        mounted = false;
        runCleanup();
      }
      runtime.unmount();
    },
    submit(operation, values) {
      return runtime.submit(operation, values);
    },
    visit(target) {
      return runtime.visit(target);
    },
    sync(target) {
      return runtime.sync(target);
    }
  };

  function runCleanup(): void {
    if (!cleanup || cleanupStarted) {
      return;
    }
    cleanupStarted = true;
    const cleanupToRun = cleanup;
    cleanup = null;
    void Promise.resolve(cleanupToRun()).catch((error: unknown) => {
      console.error("[mdan] frontend setup cleanup failed", error);
    });
  }

  function handleSetupError(error: unknown): void {
    console.error("[mdan] frontend setup failed", error);
  }

  return wrapped;
}
