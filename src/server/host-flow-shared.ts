import type { HostRequestPlan } from "./host-shared.js";

export interface HostPlanHandlers<TResult> {
  onRedirect(location: string): Promise<TResult> | TResult;
  onFavicon(): Promise<TResult> | TResult;
  onMissingLocalBrowserModule(filePath: string): Promise<TResult> | TResult;
  onBrowserShell(): Promise<TResult> | TResult;
  onRuntime(): Promise<TResult> | TResult;
  serveStaticFile(filePath: string): Promise<TResult | null> | TResult | null;
}

export async function handlePlannedHostRequest<TResult>(
  plan: HostRequestPlan,
  handlers: HostPlanHandlers<TResult>
): Promise<TResult> {
  if (plan.kind === "redirect") {
    return handlers.onRedirect(plan.location);
  }

  if (plan.kind === "favicon") {
    return handlers.onFavicon();
  }

  if (plan.kind === "local-browser-module") {
    const served = await handlers.serveStaticFile(plan.filePath);
    return served ?? handlers.onMissingLocalBrowserModule(plan.filePath);
  }

  if (plan.kind === "browser-shell") {
    return handlers.onBrowserShell();
  }

  if (plan.kind === "static-candidates") {
    for (const filePath of plan.filePaths) {
      const served = await handlers.serveStaticFile(filePath);
      if (served) {
        return served;
      }
    }
  }

  return handlers.onRuntime();
}
