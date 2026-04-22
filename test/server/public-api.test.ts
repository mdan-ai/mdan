import { describe, expect, it } from "vitest";

import * as server from "../../src/server/index.js";

describe("@mdanai/sdk/server public API", () => {
  it("exports server runtime helpers", () => {
    expect(server.createMdanServer).toBeTypeOf("function");
    expect(server.ok).toBeTypeOf("function");
    expect(server.fail).toBeTypeOf("function");
    expect(server.stream).toBeTypeOf("function");
    expect(server.cleanupExpiredAssets).toBeTypeOf("function");
  });

  it("keeps lower-level handler and result typing details off the main barrel", () => {
    expect("MdanHandler" in server).toBe(false);
    expect("MdanHandlerContext" in server).toBe(false);
    expect("MdanHandlerResult" in server).toBe(false);
    expect("MdanInputMap" in server).toBe(false);
    expect("MdanInputValue" in server).toBe(false);
    expect("MdanPageHandler" in server).toBe(false);
    expect("MdanPageHandlerContext" in server).toBe(false);
    expect("MdanPageResult" in server).toBe(false);
    expect("MdanSessionMutation" in server).toBe(false);
    expect("MdanStreamChunk" in server).toBe(false);
    expect("MdanStreamResult" in server).toBe(false);
  });

  it("keeps low-level asset store helpers off the main barrel", () => {
    expect("createLocalAssetHandle" in server).toBe(false);
    expect("getAssetHandle" in server).toBe(false);
    expect("readAsset" in server).toBe(false);
    expect("openAssetStream" in server).toBe(false);
  });

  it("keeps artifact assembly helpers off the main barrel", () => {
    expect("createArtifactPage" in server).toBe(false);
    expect("createArtifactFragment" in server).toBe(false);
    expect("createExecutableContent" in server).toBe(false);
  });

  it("keeps validation helpers and asset-store config typing off the main barrel", () => {
    expect("validatePostInputs" in server).toBe(false);
    expect("MdanAssetStoreOptions" in server).toBe(false);
    expect("AssetCleanupResult" in server).toBe(false);
  });
});
