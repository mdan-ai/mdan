import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import type { AssetCleanupResult, MdanAssetHandle, MdanAssetStoreOptions } from "./asset-types.js";
export type { AssetCleanupResult, MdanAssetHandle, MdanAssetStoreOptions } from "./asset-types.js";

interface AssetMetadata {
  id: string;
  name: string;
  mime: string;
  size: number;
  sha256: string;
  createdAtMs: number;
  expiresAtMs: number | null;
}

export function getDefaultAssetRoot(rootDir?: string): string {
  return resolve(rootDir ?? process.cwd(), ".mdan", "assets");
}

async function writeFileStreamWithDigest(file: File, blobPath: string): Promise<{ size: number; sha256: string }> {
  const hash = createHash("sha256");
  let size = 0;
  const digestStream = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      size += chunk.byteLength;
      hash.update(chunk);
      callback(null, chunk);
    }
  });

  const nodeStream = Readable.fromWeb(file.stream() as unknown as import("node:stream/web").ReadableStream<Uint8Array>);
  await pipeline(nodeStream, digestStream, createWriteStream(blobPath));

  return {
    size,
    sha256: hash.digest("hex")
  };
}

function resolveAssetRoot(options?: Pick<MdanAssetStoreOptions, "rootDir">): string {
  return getDefaultAssetRoot(options?.rootDir);
}

function getAssetDir(id: string, assetRoot: string): string {
  return join(assetRoot, id);
}

function getBlobPath(id: string, assetRoot: string): string {
  return join(getAssetDir(id, assetRoot), "blob");
}

function getMetaPath(id: string, assetRoot: string): string {
  return join(getAssetDir(id, assetRoot), "meta.json");
}

function toHandle(metadata: AssetMetadata, assetRoot: string): MdanAssetHandle {
  return {
    kind: "asset",
    id: metadata.id,
    name: metadata.name,
    mime: metadata.mime,
    size: metadata.size,
    storage: "local",
    path: getBlobPath(metadata.id, assetRoot),
    sha256: metadata.sha256
  };
}

export async function createLocalAssetHandle(
  file: File,
  options: MdanAssetStoreOptions = {}
): Promise<MdanAssetHandle> {
  const assetRoot = resolveAssetRoot(options);
  const id = `ast_${randomUUID().replaceAll("-", "")}`;
  const assetDir = getAssetDir(id, assetRoot);
  const blobPath = getBlobPath(id, assetRoot);

  const createdAtMs = options.nowMs ?? Date.now();
  const expiresAtMs =
    typeof options.ttlSeconds === "number" && Number.isFinite(options.ttlSeconds) && options.ttlSeconds > 0
      ? createdAtMs + options.ttlSeconds * 1000
      : null;

  await mkdir(assetDir, { recursive: true });
  const written = await writeFileStreamWithDigest(file, blobPath);

  const metadata: AssetMetadata = {
    id,
    name: file.name ?? "",
    mime: file.type || "application/octet-stream",
    size: written.size,
    sha256: written.sha256,
    createdAtMs,
    expiresAtMs
  };

  await writeFile(getMetaPath(id, assetRoot), JSON.stringify(metadata, null, 2));

  return toHandle(metadata, assetRoot);
}

export async function getAssetHandle(
  id: string,
  options: MdanAssetStoreOptions = {}
): Promise<MdanAssetHandle> {
  const assetRoot = resolveAssetRoot(options);
  const metadata = JSON.parse(await readFile(getMetaPath(id, assetRoot), "utf8")) as AssetMetadata;
  return toHandle(metadata, assetRoot);
}

export async function readAsset(
  id: string,
  options: MdanAssetStoreOptions = {}
): Promise<Buffer> {
  const assetRoot = resolveAssetRoot(options);
  return readFile(getBlobPath(id, assetRoot));
}

export function openAssetStream(
  id: string,
  options: MdanAssetStoreOptions = {}
) {
  const assetRoot = resolveAssetRoot(options);
  return createReadStream(getBlobPath(id, assetRoot));
}

export async function cleanupExpiredAssets(
  options: MdanAssetStoreOptions = {}
): Promise<AssetCleanupResult> {
  const assetRoot = resolveAssetRoot(options);
  const nowMs = options.nowMs ?? Date.now();
  const deletedAssetIds: string[] = [];

  let entries: string[];
  try {
    entries = await readdir(assetRoot);
  } catch {
    return { deletedAssetIds };
  }

  for (const entry of entries) {
    const metaPath = getMetaPath(entry, assetRoot);
    let metadata: AssetMetadata;
    try {
      metadata = JSON.parse(await readFile(metaPath, "utf8")) as AssetMetadata;
    } catch {
      continue;
    }
    if (typeof metadata.expiresAtMs !== "number" || metadata.expiresAtMs > nowMs) {
      continue;
    }

    await rm(getAssetDir(entry, assetRoot), { recursive: true, force: true });
    deletedAssetIds.push(entry);
  }

  return { deletedAssetIds };
}
