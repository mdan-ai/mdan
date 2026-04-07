import { describe, expect, it } from "vitest";

import { serializePage as serializePageFromCore } from "../../../src/core/index.js";
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
  it("is the same implementation re-exported from the core entrypoint", () => {
    expect(serializePage).toBe(serializePageFromCore);
  });
});
