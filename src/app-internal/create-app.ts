import { createMdanServer } from "../server/runtime.js";
import type { MdanRequestHandler } from "../server/types.js";
import type { NormalizedPage } from "./models.js";
import { normalizePageDefinition, type RawPageDefinition } from "./normalize-page.js";
import { projectArtifactPage } from "./project-artifact-page.js";

export interface CreateAppOptions<TState> {
  id: string;
  state: TState;
}

export interface InternalApp<TState> {
  page(path: string, definition: RawPageDefinition): InternalApp<TState>;
  createServer(): MdanRequestHandler;
}

export function createApp<TState>(options: CreateAppOptions<TState>): InternalApp<TState> {
  const pagesByPath = new Map<string, NormalizedPage>();
  let renderVersion = 0;

  return {
    page(path, definition) {
      pagesByPath.set(path, normalizePageDefinition({ path, definition }));
      return this;
    },

    createServer() {
      const server = createMdanServer({
        actionProof: {
          disabled: true
        }
      });

      for (const page of pagesByPath.values()) {
        server.page(page.path, async () => renderPage(page));

        for (const action of page.actions) {
          if (action.method === "GET") {
            server.get(action.path, async () => ({
              route: page.path,
              page: renderPage(resolveTargetPage(page, page.path))
            }));
            continue;
          }

          server.post(action.path, async ({ inputs, request }) => {
            const result = await action.run({
              input: inputs,
              state: options.state,
              request: {
                method: request.method,
                path: action.path,
                headers: request.headers
              }
            });
            const targetPage = resolveTargetPage(page, result.pagePath ?? page.path);

            return {
              route: targetPage.path,
              page: renderPage(targetPage)
            };
          });
        }
      }

      return server;
    }
  };

  function renderPage(page: NormalizedPage) {
    renderVersion += 1;

    const blockContent = Object.fromEntries(
      page.blocks.map((block) => [
        block.name,
        block.render({
          state: options.state
        })
      ])
    ) as Record<string, string>;

    return projectArtifactPage({
      appId: options.id,
      page,
      stateId: `${options.id}:${page.id}:${renderVersion}`,
      stateVersion: renderVersion,
      route: page.path,
      blockContent
    });
  }

  function resolveTargetPage(currentPage: NormalizedPage, pagePath: string): NormalizedPage {
    return pagesByPath.get(pagePath) ?? currentPage;
  }
}
