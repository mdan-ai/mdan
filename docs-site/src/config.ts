export interface DocsSiteRuntimeConfig {
  host: string;
  port: number;
  siteOrigin: string;
  siteTitle: string;
  assetVersion?: string;
}

const DEFAULT_PORT = 4332;

function toPort(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

export function resolveDocsSiteRuntimeConfig(
  env: Record<string, string | undefined> = process.env
): DocsSiteRuntimeConfig {
  const siteOrigin = env.SITE_ORIGIN?.trim() || "https://docs.mdan.ai";
  const siteTitle = env.SITE_TITLE?.trim() || "MDAN Docs";
  const host = env.HOST?.trim() || "0.0.0.0";
  const assetVersion = env.DOCS_ASSET_VERSION?.trim() || undefined;

  const config: DocsSiteRuntimeConfig = {
    host,
    port: toPort(env.PORT),
    siteOrigin,
    siteTitle
  };

  if (assetVersion) {
    config.assetVersion = assetVersion;
  }

  return config;
}
