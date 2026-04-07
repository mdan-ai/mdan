import { composePage } from "@mdanai/sdk/core";
import { createHostedApp } from "@mdanai/sdk/server";

export interface CreateExpressStarterServerOptions {
  source: string;
  initialMessages?: string[];
}

export function createExpressStarterServer(options: CreateExpressStarterServerOptions) {
  const messages = [...(options.initialMessages ?? ["Welcome to MDAN"])];

  function renderGuestbookBlock(): string {
    const count = `${messages.length} live ${messages.length === 1 ? "message" : "messages"}`;
    return `## ${count}\n\n${messages.map((message) => `- ${message}`).join("\n")}`;
  }

  function renderGuestbookPage() {
    return composePage(options.source, {
      blocks: {
        guestbook: renderGuestbookBlock()
      }
    });
  }

  return createHostedApp({
    pages: {
      "/": renderGuestbookPage
    },
    actions: [
      {
        target: "/list",
        methods: ["GET"],
        routePath: "/",
        blockName: "guestbook",
        handler: ({ block }) => block()
      },
      {
        target: "/post",
        methods: ["POST"],
        routePath: "/",
        blockName: "guestbook",
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
