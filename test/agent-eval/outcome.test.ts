import { describe, expect, it } from "vitest";

import { evaluateAgentRunOutcome } from "./support/index.js";

describe("agent eval outcome", () => {
  it("passes an A0 run when business, UI, and protocol oracles all pass", () => {
    expect(
      evaluateAgentRunOutcome({
        assumptionLevel: "A0",
        oracle: {
          business: { passed: true },
          ui: { passed: true },
          protocol: { passed: true }
        }
      })
    ).toEqual({
      status: "PASS",
      failureCategory: undefined,
      assumptionLevelReached: "A0"
    });
  });

  it("marks an A1 success as assisted instead of primary pass", () => {
    expect(
      evaluateAgentRunOutcome({
        assumptionLevel: "A1",
        oracle: {
          business: { passed: true },
          ui: { passed: true },
          protocol: { passed: true }
        }
      }).status
    ).toBe("PASS_WITH_ASSIST");
  });

  it("fails protocol violations even when the business and UI results succeeded", () => {
    expect(
      evaluateAgentRunOutcome({
        assumptionLevel: "A0",
        oracle: {
          business: { passed: true },
          ui: { passed: true },
          protocol: {
            passed: false,
            failureCategory: "protocol_violation",
            message: "Agent guessed an endpoint that was not exposed by the page."
          }
        }
      })
    ).toEqual({
      status: "FAIL",
      failureCategory: "protocol_violation",
      assumptionLevelReached: "A0"
    });
  });

  it("uses the first failed oracle category for diagnosable failures", () => {
    expect(
      evaluateAgentRunOutcome({
        assumptionLevel: "A0",
        oracle: {
          business: {
            passed: false,
            failureCategory: "result_interpretation_failure",
            message: "The submitted record was not created."
          },
          ui: { passed: true },
          protocol: { passed: true }
        }
      }).failureCategory
    ).toBe("result_interpretation_failure");
  });
});
