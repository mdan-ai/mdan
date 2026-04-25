import type { HostRequestPlan } from "./shared.js";

export interface HostPlanHandlers<TResult> {
  onRedirect(location: string): Promise<TResult> | TResult;
  onFavicon(): Promise<TResult> | TResult;
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
