import { createArtifactPage } from "../server/artifact.js";
import type { NormalizedPage } from "./models.js";
import { projectActionManifest } from "./project-action-manifest.js";
import { projectBlockOperations } from "./project-block-operations.js";
import { projectFrontmatter } from "./project-frontmatter.js";

export interface ProjectArtifactPageOptions {
  appId: string;
  page: NormalizedPage;
  stateId: string;
  stateVersion: number;
  route: string;
  blockContent: Record<string, string>;
}

export function projectArtifactPage(options: ProjectArtifactPageOptions) {
  const blockNames = options.page.blocks.map((block) => block.name);
  const executableJson = projectActionManifest({
    appId: options.appId,
    stateId: options.stateId,
    stateVersion: options.stateVersion,
    blockNames,
    actions: options.page.actions
  });

  return createArtifactPage({
    frontmatter: projectFrontmatter({
      appId: options.appId,
      stateId: options.stateId,
      stateVersion: options.stateVersion,
      route: options.route
    }),
    markdown: options.page.markdownSource,
    executableJson,
    blockContent: options.blockContent,
    blocks: options.page.blocks.map((block) => ({
      name: block.name,
      inputs: [],
      operations: projectBlockOperations(
        options.page.actions.filter((action) => action.pageId === options.page.id)
      )
    }))
  });
}

