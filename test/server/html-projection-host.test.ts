import { describe, expect, it } from "vitest";

import { createHost } from "../../src/server/bun.js";
import { toMarkdownContentType } from "../../src/server/content-type.js";
import type { MdanRequest, MdanResponse } from "../../src/server/types/transport.js";

function markdownResponse(body: string): MdanResponse {
  return {
    status: 200,
    headers: {
      "content-type": toMarkdownContentType()
    },
    body
  };
}

describe("html projection host mode", () => {
  it("renders readable markdown into natural browser routes when html projection is enabled", async () => {
    const seen: MdanRequest[] = [];
    const host = createHost(
      {
        async handle(request) {
          seen.push(request);
          return markdownResponse(`---
title: Public Page
description: Indexed content.
---

# Public Page

Visible before JavaScript.
`);
        }
      },
      {
        frontend: true,
        browser: {
          projection: "html"
        }
      }
    );

    const response = await host(new Request("https://example.test/public", {
      headers: {
        accept: "text/html"
      }
    }));
    const html = await response.text();

    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(html).toContain("<title>Public Page</title>");
    expect(html).toContain("<h1>Public Page</h1>");
    expect(html).toContain("<p>Visible before JavaScript.</p>");
    expect(html).not.toContain("initialMarkdown:");
    expect(html).toContain("initialActions:");
    expect(seen).toHaveLength(1);
    expect(seen[0]?.headers.accept).toBe(toMarkdownContentType());
  });

  it("keeps markdown suffix routes on the raw markdown runtime", async () => {
    const host = createHost(
      {
        async handle() {
          return markdownResponse("# Raw Surface");
        }
      },
      {
        frontend: true,
        browser: {
          projection: "html"
        }
      }
    );

    const response = await host(new Request("https://example.test/public.md", {
      headers: {
        accept: "text/html"
      }
    }));

    expect(response.headers.get("content-type")).toBe(toMarkdownContentType());
    expect(await response.text()).toBe("# Raw Surface");
  });
});
