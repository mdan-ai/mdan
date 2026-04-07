import { describe, expect, it } from "vitest";

import { serializeBlock, serializePage } from "../../../src/core/syntax/index.js";
import type { MdanPage } from "../../../src/core/types.js";

describe("serializeBlock", () => {
  it("serializes inputs and operations in canonical syntax", () => {
    expect(
      serializeBlock({
        name: "login",
        inputs: [
          { name: "nickname", type: "text", required: true, secret: false },
          { name: "password", type: "text", required: true, secret: true },
          { name: "status", type: "choice", required: false, secret: false, options: ["draft", "published"] }
        ],
        operations: [
          {
            method: "POST",
            name: "sign_in",
            target: "/login",
            inputs: ["nickname", "password"],
            label: "Sign In"
          },
          {
            method: "GET",
            name: "events",
            target: "/events",
            inputs: [],
            accept: "text/event-stream"
          },
          {
            method: "GET",
            name: "load_messages",
            target: "/messages",
            inputs: [],
            auto: true
          }
        ]
      })
    ).toBe(`BLOCK login {
  INPUT nickname:text required
  INPUT password:text required secret
  INPUT status:choice ["draft", "published"]
  POST sign_in "/login" WITH nickname, password LABEL "Sign In"
  GET events "/events" ACCEPT "text/event-stream"
  GET load_messages "/messages" AUTO
}`);
  });
});

describe("serializePage", () => {
  it("serializes pages using the current block syntax", () => {
    const page: MdanPage = {
      frontmatter: { title: "Login" },
      markdown: "# Login\n\n<!-- mdan:block login -->",
      blockContent: {
        login: "## Please sign in"
      },
      blocks: [
        {
          name: "login",
          inputs: [
            { name: "nickname", type: "text", required: true, secret: false },
            { name: "password", type: "text", required: true, secret: true }
          ],
          operations: [
            {
              method: "POST",
              name: "sign_in",
              target: "/login",
              inputs: ["nickname", "password"],
              label: "Sign In"
            }
          ]
        }
      ],
      blockAnchors: ["login"]
    };

    expect(serializePage(page)).toContain('INPUT nickname:text required');
    expect(serializePage(page)).toContain('POST sign_in "/login" WITH nickname, password LABEL "Sign In"');
    expect(serializePage(page)).not.toContain("INPUT text");
    expect(serializePage(page)).not.toContain("-> sign_in");
  });
});
