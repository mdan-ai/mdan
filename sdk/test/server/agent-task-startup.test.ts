import http from "node:http";

import { afterEach, describe, expect, it } from "vitest";

import { listenWithFallback } from "../../../demo/agent-tasks/app/start-server.js";

const servers = new Set<http.Server>();

afterEach(async () => {
  await Promise.all(
    [...servers].map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            servers.delete(server);
            resolve();
          });
        })
    )
  );
});

function track(server: http.Server): http.Server {
  servers.add(server);
  return server;
}

describe("agent tasks startup", () => {
  it("listens on the preferred port when it is available", async () => {
    const server = track(http.createServer((_req, res) => res.end("ok")));

    const result = await listenWithFallback(server, "127.0.0.1", 0);

    expect(result.port).toBeGreaterThan(0);
  });

  it("falls back to an ephemeral port when the preferred port is already in use", async () => {
    const occupied = track(http.createServer((_req, res) => res.end("occupied")));
    await new Promise<void>((resolve) => occupied.listen(0, "127.0.0.1", () => resolve()));
    const address = occupied.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected TCP address.");
    }

    const candidate = track(http.createServer((_req, res) => res.end("fallback")));
    const result = await listenWithFallback(candidate, "127.0.0.1", address.port);

    expect(result.port).not.toBe(address.port);
    expect(result.port).toBeGreaterThan(0);
  });
});
