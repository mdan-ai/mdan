import { describe, expect, it } from "vitest";

import { resolveDocsSiteRuntimeConfig } from "../../../docs-site/src/config.js";

describe("docs-site runtime config", () => {
  it("uses deployment-friendly defaults", () => {
    const config = resolveDocsSiteRuntimeConfig({});

    expect(config.host).toBe("0.0.0.0");
    expect(config.port).toBe(4332);
    expect(config.siteOrigin).toBe("https://docs.mdan.ai");
    expect(config.siteTitle).toBe("MDAN Docs");
  });

  it("respects environment overrides", () => {
    const config = resolveDocsSiteRuntimeConfig({
      HOST: "127.0.0.1",
      PORT: "9001",
      SITE_ORIGIN: "https://staging.docs.mdan.ai/",
      SITE_TITLE: "MDAN Docs Preview",
      DOCS_ASSET_VERSION: "build-123"
    });

    expect(config.host).toBe("127.0.0.1");
    expect(config.port).toBe(9001);
    expect(config.siteOrigin).toBe("https://staging.docs.mdan.ai/");
    expect(config.siteTitle).toBe("MDAN Docs Preview");
    expect(config.assetVersion).toBe("build-123");
  });

  it("falls back when port is invalid", () => {
    const config = resolveDocsSiteRuntimeConfig({
      PORT: "nope"
    });

    expect(config.port).toBe(4332);
  });
});
