export interface ProjectFrontmatterOptions {
  appId: string;
  stateId: string;
  stateVersion: number;
  route: string;
}

export function projectFrontmatter(options: ProjectFrontmatterOptions) {
  return {
    app_id: options.appId,
    state_id: options.stateId,
    state_version: options.stateVersion,
    response_mode: "page" as const,
    route: options.route
  };
}

