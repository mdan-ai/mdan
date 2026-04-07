import { composePageV2 } from "@mdanai/sdk/core";
import { createHostedApp } from "@mdanai/sdk/server";
import { marked } from "marked";

export interface CreateAppServerOptions {
  source: string;
  initialMessages?: string[];
}

export const markedMarkdownRenderer = {
  render(markdown: string): string {
    return marked.parse(markdown) as string;
  }
};

export function createAppServer(options: CreateAppServerOptions) {
  const messages = [...(options.initialMessages ?? ["**Welcome** to MDAN"])];

  function renderMainBlock(): string {
    const count = `${messages.length} live ${messages.length === 1 ? "message" : "messages"}`;
    return `## ${count}\n\n${messages.map((message) => `- ${message}`).join("\n")}`;
  }

  function renderPage() {
    return composePageV2(options.source, {
      blocks: {
        main: renderMainBlock()
      }
    });
  }

  return createHostedApp({
    markdownRenderer: markedMarkdownRenderer,
    pages: {
      "/": renderPage
    },
    actions: [
      {
        target: "/list",
        methods: ["GET"],
        routePath: "/",
        blockName: "main",
        handler: ({ block }) => block()
      },
      {
        target: "/post",
        methods: ["POST"],
        routePath: "/",
        blockName: "main",
        handler: ({ inputs, block }) => {
          if (inputs.message) {
            messages.push(inputs.message);
          }
          return block();
        }
      }
    ]
  });
}
