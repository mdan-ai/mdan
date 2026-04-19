export interface MdanAssetHandle {
  kind: "asset";
  id: string;
  name: string;
  mime: string;
  size: number;
  storage: "local";
  path: string;
  sha256: string;
}

export interface MdanAssetStoreOptions {
  rootDir?: string;
  ttlSeconds?: number;
  nowMs?: number;
}

export interface AssetCleanupResult {
  deletedAssetIds: string[];
}
