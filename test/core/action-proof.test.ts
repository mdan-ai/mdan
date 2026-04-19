import { describe, expect, it } from "vitest";

import { createActionProofToken, verifyActionProofToken } from "../../src/server/action-proof.js";

describe("action proof", () => {
  it("creates and verifies a valid token", () => {
    const token = createActionProofToken(
      {
        actionId: "createResource",
        method: "POST",
        target: "/resources",
        inputNames: ["title"],
        issuedAt: 100,
        expiresAt: 200
      },
      "secret-key"
    );

    expect(
      verifyActionProofToken({
        token,
        secret: "secret-key",
        expectedActionId: "createResource",
        expectedMethod: "POST",
        expectedTarget: "/resources",
        nowUnixSeconds: 150
      })
    ).toBe(true);
  });

  it("rejects mismatched claims and expired tokens", () => {
    const token = createActionProofToken(
      {
        actionId: "createResource",
        method: "POST",
        target: "/resources",
        inputNames: ["title"],
        issuedAt: 100,
        expiresAt: 120
      },
      "secret-key"
    );

    expect(
      verifyActionProofToken({
        token,
        secret: "secret-key",
        expectedActionId: "wrongAction",
        expectedMethod: "POST",
        expectedTarget: "/resources",
        nowUnixSeconds: 110
      })
    ).toBe(false);

    expect(
      verifyActionProofToken({
        token,
        secret: "secret-key",
        expectedActionId: "createResource",
        expectedMethod: "POST",
        expectedTarget: "/resources",
        nowUnixSeconds: 130
      })
    ).toBe(false);
  });
});
