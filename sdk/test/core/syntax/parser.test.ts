import { describe, expect, it } from "vitest";

import { parseBlocks } from "../../../src/core/syntax/index.js";

describe("parseBlocks", () => {
  it("parses input declarations with name-first syntax", () => {
    const blocks = parseBlocks(`BLOCK login {
  INPUT nickname:text required
  INPUT password:text required secret
  INPUT status:choice ["draft", "published"]
}`);

    expect(blocks).toEqual([
      {
        name: "login",
        inputs: [
          { name: "nickname", type: "text", required: true, secret: false },
          { name: "password", type: "text", required: true, secret: true },
          { name: "status", type: "choice", required: false, secret: false, options: ["draft", "published"] }
        ],
        operations: []
      }
    ]);
  });

  it("parses compact single-line operations", () => {
    const blocks = parseBlocks(`BLOCK login {
  POST sign_in "/login" WITH nickname, password LABEL "Sign In"
  GET register "/register" LABEL "Register"
  GET events "/events" ACCEPT "text/event-stream"
  GET load_messages "/messages" AUTO
}`);

    expect(blocks[0]?.operations).toEqual([
      {
        method: "POST",
        name: "sign_in",
        target: "/login",
        inputs: ["nickname", "password"],
        label: "Sign In",
        auto: undefined,
        accept: undefined
      },
      {
        method: "GET",
        name: "register",
        target: "/register",
        inputs: [],
        label: "Register",
        auto: undefined,
        accept: undefined
      },
      {
        method: "GET",
        name: "events",
        target: "/events",
        inputs: [],
        label: undefined,
        auto: undefined,
        accept: "text/event-stream"
      },
      {
        method: "GET",
        name: "load_messages",
        target: "/messages",
        inputs: [],
        label: undefined,
        auto: true,
        accept: undefined
      }
    ]);
  });

  it("parses multiline continuation clauses with the same semantics", () => {
    const blocks = parseBlocks(`BLOCK login {
  POST sign_in "/login"
    WITH nickname, password
    LABEL "Sign In"

  GET events "/events"
    ACCEPT "text/event-stream"
}`);

    expect(blocks[0]?.operations).toEqual([
      {
        method: "POST",
        name: "sign_in",
        target: "/login",
        inputs: ["nickname", "password"],
        label: "Sign In",
        auto: undefined,
        accept: undefined
      },
      {
        method: "GET",
        name: "events",
        target: "/events",
        inputs: [],
        label: undefined,
        auto: undefined,
        accept: "text/event-stream"
      }
    ]);
  });

  it("rejects unknown continuation clauses", () => {
    expect(() =>
      parseBlocks(`BLOCK login {
  POST sign_in "/login"
    TARGET "/other"
}`)
    ).toThrow(/Unknown continuation clause/i);
  });
});
