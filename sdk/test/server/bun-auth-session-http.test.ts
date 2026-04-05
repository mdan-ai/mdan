// @vitest-environment node

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createAuthServer } from "../../../examples/auth-session/app/server.js";
import { createHost } from "@mdanai/sdk/server/bun";

async function readAuthSources(): Promise<{ loginSource: string; registerSource: string; vaultSource: string }> {
  const [loginSource, registerSource, vaultSource] = await Promise.all([
    readFile(join(process.cwd(), "examples", "auth-session", "app", "login.md"), "utf8"),
    readFile(join(process.cwd(), "examples", "auth-session", "app", "register.md"), "utf8"),
    readFile(join(process.cwd(), "examples", "auth-session", "app", "vault.md"), "utf8")
  ]);
  return { loginSource, registerSource, vaultSource };
}

function cookieValue(response: Response): string {
  const value = response.headers.get("set-cookie");
  if (!value) {
    throw new Error("Expected Set-Cookie header.");
  }
  return value.split(";", 1)[0] ?? "";
}

describe("bun auth-session adapter", () => {
  it("supports login/register and vault flows through the Bun host adapter", async () => {
    const sources = await readAuthSources();
    const app = createAuthServer(sources);
    const host = createHost(app, { rootRedirect: "/login" });

    const register = await host(
      new Request("https://example.test/register", {
        method: "POST",
        headers: {
          accept: "text/markdown",
          "content-type": "text/markdown"
        },
        body: 'nickname: "BunAgent", password: "pass-1234"'
      })
    );

    expect(register.status).toBe(200);
    const sessionCookie = cookieValue(register);
    await expect(register.text()).resolves.toContain("# Vault");

    const vault = await host(
      new Request("https://example.test/vault", {
        headers: {
          accept: "text/markdown",
          cookie: sessionCookie
        }
      })
    );
    expect(vault.status).toBe(200);
    await expect(vault.text()).resolves.toContain("## Welcome BunAgent");

    const save = await host(
      new Request("https://example.test/vault", {
        method: "POST",
        headers: {
          accept: "text/markdown",
          "content-type": "text/markdown",
          cookie: sessionCookie
        },
        body: 'message: "Saved by Bun host"'
      })
    );
    expect(save.status).toBe(200);
    await expect(save.text()).resolves.toContain("Saved by Bun host");
  });
});
