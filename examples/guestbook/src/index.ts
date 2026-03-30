import { composePage } from "@mdsn/core";
import { mountMdsnElements } from "@mdsn/elements";
import { createHostedApp } from "@mdsn/server";
import { createHeadlessHost } from "@mdsn/web";

export interface CreateGuestbookServerOptions {
  source: string;
  initialMessages?: string[];
}

export function createGuestbookServer(options: CreateGuestbookServerOptions) {
  const messages = [...(options.initialMessages ?? ["Welcome to MDSN"])];

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
      "/guestbook": renderGuestbookPage
    },
    actions: [
      {
        target: "/list",
        methods: ["GET"],
        routePath: "/guestbook",
        blockName: "guestbook",
        handler: ({ block }) => block()
      },
      {
        target: "/post",
        methods: ["POST"],
        routePath: "/guestbook",
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

export function mountGuestbook(root: HTMLElement, fetchImpl: typeof fetch): void {
  const host = createHeadlessHost({ root, fetchImpl });
  mountMdsnElements({ root, host }).mount();
}
