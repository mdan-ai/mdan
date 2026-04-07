import { composePage } from "@mdanai/sdk/core";
import { createHostedApp } from "@mdanai/sdk/server";

export interface CreateAppServerOptions {
  source: string;
  initialMessages?: string[];
}

export function createAppServer(options: CreateAppServerOptions) {
  const messages = [...(options.initialMessages ?? ["Welcome to MDAN"])];

  function renderMainBlock(): string {
    const count = `${messages.length} live ${messages.length === 1 ? "message" : "messages"}`;
    return `## ${count}\n\n${messages.map((message) => `- ${message}`).join("\n")}`;
  }

  function renderPage() {
    return composePage(options.source, {
      blocks: {
        main: renderMainBlock()
      }
    });
  }

  return createHostedApp({
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
