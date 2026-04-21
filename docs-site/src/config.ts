export interface DocsSiteRuntimeConfig {
  host: string;
  port: number;
  siteOrigin: string;
  siteTitle: string;
}

const DEFAULT_PORT = 4332;

function toPort(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

export function resolveDocsSiteRuntimeConfig(
  env: Record<string, string | undefined> = process.env
): DocsSiteRuntimeConfig {
  return {
    host: env.HOST?.trim() || "127.0.0.1",
    port: toPort(env.PORT),
    siteOrigin: env.SITE_ORIGIN?.trim() || "https://docs.mdan.ai",
    siteTitle: env.SITE_TITLE?.trim() || "MDAN SDK Docs"
  };
}
