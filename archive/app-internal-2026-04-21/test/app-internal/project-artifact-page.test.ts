import { describe, expect, it } from "vitest";

import { normalizePageDefinition } from "../../src/app-internal/normalize-page.js";
import { projectArtifactPage } from "../../src/app-internal/project-artifact-page.js";

describe("projectArtifactPage", () => {
  it("projects a normalized page into an artifact page", () => {
    const page = normalizePageDefinition({
      path: "/",
      definition: {
        markdownPath: "./app/index.md",
        markdownSource: `# Starter App

## Purpose
Basic Markdown-first MDAN starter flow.

## Context
This page shows the current starter message feed and the next available actions.

## Rules
Read the current feed from the returned artifact and submit new messages through the declared action contract.

## Result
::: block{id="main" actions="refresh_main,submit_message" trust="untrusted"}
:::`,
        blocks: {
          main() {
            return `## Context
This block shows the current starter message feed and accepts a new message submission.

## Result
- Booted`;
          }
        },
        actions: {
          refresh_main: {
            method: "GET"
          },
          submit_message: {
            method: "POST",
            path: "/post",
            label: "Submit",
            input: {
              message: {
                kind: "text",
                required: true
              }
            },
            run() {
              return { pagePath: "/" };
            }
          }
        }
      }
    });

    const artifact = projectArtifactPage({
      appId: "starter",
      page,
      stateId: "starter:home:1",
      stateVersion: 1,
      route: "/",
      blockContent: {
        main: `## Context
This block shows the current starter message feed and accepts a new message submission.

## Result
- Booted`
      }
    });

    expect(artifact.frontmatter).toEqual({
      app_id: "starter",
      state_id: "starter:home:1",
      state_version: 1,
      response_mode: "page",
      route: "/"
    });
    expect(artifact.blockContent).toEqual({
      main: `## Context
This block shows the current starter message feed and accepts a new message submission.

## Result
- Booted`
    });
    expect(artifact.blocks).toHaveLength(1);
    expect(artifact.blocks[0]).toMatchObject({
      name: "main"
    });
    expect(artifact.blocks[0]?.operations).toHaveLength(2);
    expect(artifact.executableContent).toContain('"app_id": "starter"');
    expect(artifact.executableContent).toContain('"submit_message"');
    expect(artifact.blockAnchors).toContain("main");
    expect(artifact.visibleBlockNames).toContain("main");
  });
});
