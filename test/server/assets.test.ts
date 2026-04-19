import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  cleanupExpiredAssets,
  createLocalAssetHandle,
  getAssetHandle,
  getDefaultAssetRoot,
  readAsset
} from "../../src/server/assets.js";

const roots: string[] = [];

function trackRoot(name: string): string {
  const root = join(tmpdir(), `mdan-asset-store-${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("asset store ttl cleanup", () => {
  it("writes ttl metadata for local assets", async () => {
    const rootDir = trackRoot("meta");
    const createdAtMs = 1_700_000_000_000;
    const handle = await createLocalAssetHandle(new File(["hello"], "hello.txt", { type: "text/plain" }), {
      rootDir,
      ttlSeconds: 60,
      nowMs: createdAtMs
    });

    const metaPath = join(getDefaultAssetRoot(rootDir), handle.id, "meta.json");
    const metadata = JSON.parse(await readFile(metaPath, "utf8")) as Record<string, unknown>;

    expect(metadata.id).toBe(handle.id);
    expect(metadata.name).toBe("hello.txt");
    expect(metadata.createdAtMs).toBe(createdAtMs);
    expect(metadata.expiresAtMs).toBe(createdAtMs + 60_000);
  });

  it("cleans up expired assets and keeps active ones", async () => {
    const rootDir = trackRoot("cleanup");
    const expired = await createLocalAssetHandle(new File(["old"], "old.txt", { type: "text/plain" }), {
      rootDir,
      ttlSeconds: 1,
      nowMs: 1_000
    });
    const active = await createLocalAssetHandle(new File(["new"], "new.txt", { type: "text/plain" }), {
      rootDir,
      ttlSeconds: 60,
      nowMs: 1_000
    });

    const result = await cleanupExpiredAssets({
      rootDir,
      nowMs: 5_000
    });

    expect(result.deletedAssetIds).toEqual([expired.id]);
    await expect(getAssetHandle(active.id, { rootDir })).resolves.toMatchObject({ id: active.id, name: "new.txt" });
    await expect(getAssetHandle(expired.id, { rootDir })).rejects.toThrow();
  });

  it("fails to read expired assets after cleanup", async () => {
    const rootDir = trackRoot("read-after-cleanup");
    const expired = await createLocalAssetHandle(new File(["old"], "old.txt", { type: "text/plain" }), {
      rootDir,
      ttlSeconds: 1,
      nowMs: 1_000
    });

    await cleanupExpiredAssets({
      rootDir,
      nowMs: 5_000
    });

    await expect(getAssetHandle(expired.id, { rootDir })).rejects.toThrow();
    await expect(readAsset(expired.id, { rootDir })).rejects.toThrow();
  });

  it("falls back to application/octet-stream when file type is empty", async () => {
    const rootDir = trackRoot("mime-fallback");
    const handle = await createLocalAssetHandle(new File(["hello"], "blob.bin"), {
      rootDir
    });

    expect(handle.mime).toBe("application/octet-stream");
  });
});
