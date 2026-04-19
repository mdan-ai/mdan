import { describe, expect, it } from "vitest";

import { defineAgentEvalCase, validateAgentEvalCase } from "./support/index.js";

describe("agent eval case", () => {
  it("defines a single-step A0 case with stable defaults", () => {
    expect(
      defineAgentEvalCase({
        id: "submit-message",
        tier: "single-step",
        title: "Submit a message",
        goal: "Create a message through the page interaction.",
        url: "https://example.test/messages",
        prompt: "Open the page and submit the message: hello from test.",
        oracle: {
          business: "A message record exists with the submitted text.",
          ui: "The page shows the submitted message or a success confirmation.",
          protocol: "The agent used the page-exposed submit action."
        }
      })
    ).toEqual({
      id: "submit-message",
      tier: "single-step",
      title: "Submit a message",
      goal: "Create a message through the page interaction.",
      url: "https://example.test/messages",
      prompt: "Open the page and submit the message: hello from test.",
      tags: [],
      assumptionLevels: ["A0"],
      timeoutMs: 120000,
      maxSteps: 20,
      oracle: {
        business: "A message record exists with the submitted text.",
        ui: "The page shows the submitted message or a success confirmation.",
        protocol: "The agent used the page-exposed submit action."
      }
    });
  });

  it("reports missing fields as diagnosable case definition errors", () => {
    expect(
      validateAgentEvalCase({
        id: "",
        tier: "single-step",
        title: "Broken case",
        goal: "",
        url: "",
        prompt: "",
        oracle: {
          business: "",
          ui: "",
          protocol: ""
        }
      })
    ).toEqual([
      "id is required",
      "goal is required",
      "url is required",
      "prompt is required",
      "oracle.business is required",
      "oracle.ui is required",
      "oracle.protocol is required"
    ]);
  });
});
