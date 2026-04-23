import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { actions, createApp } from "../../src/index.js";

import { createHomeWeatherResult, createWeatherArtifact, type WeatherRange } from "./src/artifacts.js";
import { weatherMarkdownRenderer } from "./src/html-renderer.js";
import { weatherConditionName } from "./src/open-meteo.js";
import { createWeatherProvider } from "./src/providers.js";
import type { WeatherProvider } from "./src/weather-provider.js";

const root = dirname(fileURLToPath(import.meta.url));
const entryMarkdown = readFileSync(join(root, "app", "index.md"), "utf8");

interface RootRequestContext {
  url: string;
  headers: Record<string, string | undefined>;
}

interface RootIpLookup {
  ip: string;
  locale: string;
}

interface RootCoordinateTarget {
  latitude: number;
  longitude: number;
  timezone?: string;
  label?: string;
}

interface RootIpLocationResult {
  location?: string;
  coordinates?: RootCoordinateTarget;
}

interface RootLocationResolver {
  resolveIpLocation?(lookup: RootIpLookup): Promise<RootIpLocationResult | string | null> | RootIpLocationResult | string | null;
}

export interface CreateWeatherMarkdownServerOptions {
  rootLocation?: RootLocationResolver;
}

type RootTarget =
  | { kind: "location"; location: string; source: "explicit" | "auto" }
  | { kind: "coordinates"; latitude: number; longitude: number; timezone?: string; label?: string }
  | { kind: "bootstrap" };

const DEFAULT_IP_GEOLOOKUP_ENDPOINT = "https://api.country.is";

const queryInput = {
  location: {
    required: true,
    schema: {
      type: "string",
      description: "城市或地点，例如 西安、Tokyo、London"
    }
  },
  range: {
    schema: {
      type: "string",
      enum: ["current", "today", "tomorrow", "daily", "3d", "7d"],
      description: "查询范围。省略时默认 current。daily 需要额外提供 date=YYYY-MM-DD"
    }
  },
  event: {
    schema: {
      type: "string",
      enum: [
        "rain",
        "snow",
        "clear",
        "cloudy",
        "fog",
        "thunderstorm",
        "temp_above",
        "temp_below",
        "wind_above",
        "wind_below",
        "precip_above",
        "precip_below"
      ],
      description: "事件布尔查询。命中时返回纯文本 true/false。"
    }
  },
  threshold: {
    schema: {
      type: "number",
      description: "阈值，仅用于 *_above / *_below。温度单位为 °C，风速单位为 km/h，降水单位为 %。"
    }
  },
  profile: {
    schema: {
      type: "string",
      enum: ["brief", "table", "full"],
      description: "返回粒度。省略时，current/today/tomorrow 默认 brief，3d/7d 默认 table"
    }
  },
  units: {
    schema: {
      type: "string",
      enum: ["metric", "us"],
      default: "metric",
      description: "温度单位：metric 使用 °C，us 使用 °F"
    }
  },
  wind: {
    schema: {
      type: "string",
      enum: ["kmh", "ms", "mph"],
      default: "kmh",
      description: "风速单位：kmh、ms、mph"
    }
  },
  date: {
    schema: {
      type: "string",
      description: "daily/today/tomorrow 的基准 ISO 日期，例如 2026-04-20"
    }
  },
  locale: {
    schema: {
      type: "string",
      default: "zh-CN"
    }
  }
} as const;

type WeatherEventType =
  | "rain"
  | "snow"
  | "clear"
  | "cloudy"
  | "fog"
  | "thunderstorm"
  | "temp_above"
  | "temp_below"
  | "wind_above"
  | "wind_below"
  | "precip_above"
  | "precip_below";

function createQueryInput(provider: WeatherProvider) {
  const rangeValues =
    provider.capabilities.maxForecastDays >= 7
      ? ["current", "today", "tomorrow", "daily", "3d", "7d"]
      : ["current", "today", "tomorrow", "daily", "3d"];
  return {
    ...queryInput,
    range: {
      schema: {
        ...queryInput.range.schema,
        enum: rangeValues,
        description:
          provider.capabilities.maxForecastDays >= 7
            ? queryInput.range.schema.description
            : "查询范围。省略时默认 current。当前数据源支持 current、today、tomorrow、daily、3d"
      }
    }
  } as const;
}

function createEntryMarkdown(provider: WeatherProvider): string {
  if (provider.capabilities.maxForecastDays >= 7) {
    return entryMarkdown;
  }

  return entryMarkdown.replace("- `7d`: 7 day forecast table\n", "");
}

function toRange(value: unknown): WeatherRange {
  return value === "current" ||
    value === "daily" ||
    value === "today" ||
    value === "tomorrow" ||
    value === "3d" ||
    value === "7d"
    ? value
    : "current";
}

function toEventType(value: string | null): WeatherEventType | null {
  return value === "rain" ||
    value === "snow" ||
    value === "clear" ||
    value === "cloudy" ||
    value === "fog" ||
    value === "thunderstorm" ||
    value === "temp_above" ||
    value === "temp_below" ||
    value === "wind_above" ||
    value === "wind_below" ||
    value === "precip_above" ||
    value === "precip_below"
    ? value
    : null;
}

function todayIso(timezone: string): string {
  const timeZone = timezone === "auto" ? "UTC" : timezone;
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function addDaysIso(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function normalizeCondition(condition: string): string {
  return condition.trim().toLowerCase();
}

function parseThreshold(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function evaluateEventBoolean(
  event: WeatherEventType,
  condition: string,
  tempMinC: number,
  tempMaxC: number,
  precipitationProbabilityMax: number,
  windSpeedMaxKmh: number,
  threshold: number | null
): boolean {
  const normalized = normalizeCondition(condition);
  const has = (pattern: RegExp) => pattern.test(normalized);
  const safe = (value: number) => Number.isFinite(value) ? value : NaN;
  const min = safe(tempMinC);
  const max = safe(tempMaxC);
  const precip = safe(precipitationProbabilityMax);
  const wind = safe(windSpeedMaxKmh);

  if (event === "rain") {
    return has(/\brain\b|\bdrizzle\b|\bshower\b/);
  }
  if (event === "snow") {
    return has(/\bsnow\b|\bsleet\b|\bblizzard\b|ice pellets/);
  }
  if (event === "clear") {
    return has(/\bclear\b|\bsunny\b/);
  }
  if (event === "cloudy") {
    return has(/\bcloud\b|\bovercast\b/);
  }
  if (event === "fog") {
    return has(/\bfog\b|\bmist\b|\bhaze\b/);
  }
  if (event === "thunderstorm") {
    return has(/\bthunder\b|\bstorm\b/);
  }
  if (event === "temp_above") {
    return threshold !== null && Number.isFinite(max) && max > threshold;
  }
  if (event === "temp_below") {
    return threshold !== null && Number.isFinite(min) && min < threshold;
  }
  if (event === "wind_above") {
    return threshold !== null && Number.isFinite(wind) && wind > threshold;
  }
  if (event === "wind_below") {
    return threshold !== null && Number.isFinite(wind) && wind < threshold;
  }
  if (event === "precip_above") {
    return threshold !== null && Number.isFinite(precip) && precip > threshold;
  }
  return threshold !== null && Number.isFinite(precip) && precip < threshold;
}

function eventResultLine(
  locale: string,
  isTrue: boolean,
  event: WeatherEventType,
  location: string,
  date: string,
  condition: string,
  tempMinC: number,
  tempMaxC: number,
  precipitationProbabilityMax: number,
  windSpeedMaxKmh: number,
  threshold: number | null
): string {
  const verdict = isTrue ? "YES" : "NO";
  const conditionText = condition || "unknown";
  const metrics = `temp_min_c=${tempMinC.toFixed(1)},temp_max_c=${tempMaxC.toFixed(1)},precip_prob=${Math.round(precipitationProbabilityMax)}%,wind_kmh=${windSpeedMaxKmh.toFixed(1)}`;
  const thresholdText = threshold !== null ? `,threshold=${threshold}` : "";
  if (locale.startsWith("zh")) {
    return `${verdict}. ${location} ${date} ${event}; condition=${conditionText}; ${metrics}${thresholdText}`;
  }
  return `${verdict}. ${location} ${date} ${event}; condition=${conditionText}; ${metrics}${thresholdText}`;
}

function hasEventQuery(url: string): boolean {
  return toEventType(new URL(url).searchParams.get("event")) !== null;
}

function resolveProfile(value: string | null, range: WeatherRange): "brief" | "table" | "full" {
  if (value === "brief" || value === "table" || value === "full") {
    return value;
  }

  return range === "3d" || range === "7d" ? "table" : "brief";
}

function prefersHtml(request: { headers: Record<string, string | undefined> }): boolean {
  return request.headers.accept?.includes("text/html") === true;
}

function detectRequestLocale(request: { headers: Record<string, string | undefined> }, url: string): string {
  const explicit = new URL(url).searchParams.get("locale")?.trim();
  if (explicit) {
    return explicit;
  }

  const acceptLanguage = request.headers["accept-language"]?.trim();
  if (!acceptLanguage) {
    return "zh-CN";
  }

  const first = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0]?.trim())
    .find(Boolean);

  return first || "zh-CN";
}

function detectClientIp(request: { headers: Record<string, string | undefined> }): string | null {
  const forwardedFor = request.headers["x-forwarded-for"]?.split(",")[0]?.trim();
  const candidates = [
    request.headers["cf-connecting-ip"],
    request.headers["x-real-ip"],
    forwardedFor
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value || value === "127.0.0.1" || value === "::1") {
      continue;
    }
    return value;
  }

  return null;
}

async function fetchJson(url: URL): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return null;
    }

    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeIpLookupResult(value: RootIpLocationResult | string | null | undefined): RootIpLocationResult | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const location = value.trim();
    return location ? { location } : null;
  }

  const location = typeof value.location === "string" && value.location.trim() ? value.location.trim() : undefined;
  const coordinates = value.coordinates;
  if (
    coordinates &&
    Number.isFinite(coordinates.latitude) &&
    Number.isFinite(coordinates.longitude)
  ) {
    return {
      ...(location ? { location } : {}),
      coordinates: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        ...(coordinates.timezone ? { timezone: coordinates.timezone } : {}),
        ...(coordinates.label ? { label: coordinates.label } : {})
      }
    };
  }

  return location ? { location } : null;
}

async function resolveCountryIsIpLocation(lookup: RootIpLookup): Promise<RootIpLocationResult | null> {
  const url = new URL(`${DEFAULT_IP_GEOLOOKUP_ENDPOINT}/${encodeURIComponent(lookup.ip)}`);
  url.searchParams.set("fields", "city,subdivision,location,country");
  const payload = await fetchJson(url);
  const city = typeof payload?.city === "string" ? payload.city.trim() : "";
  if (city) {
    return { location: city };
  }

  const subdivision = typeof payload?.subdivision === "string" ? payload.subdivision.trim() : "";
  const country = typeof payload?.country === "string" ? payload.country.trim() : "";
  const location = subdivision || country || undefined;
  const locationPayload = payload?.location;
  const coordinates =
    locationPayload && typeof locationPayload === "object" && !Array.isArray(locationPayload)
      ? {
          latitude: readNumber((locationPayload as Record<string, unknown>).latitude),
          longitude: readNumber((locationPayload as Record<string, unknown>).longitude),
          label: location
        }
      : null;

  if (coordinates?.latitude !== null && coordinates?.longitude !== null) {
    return {
      ...(location ? { location } : {}),
      coordinates: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        ...(location ? { label: location } : {})
      }
    };
  }

  return location ? { location } : null;
}

async function resolveReallyFreeGeoIpLocation(lookup: RootIpLookup): Promise<RootIpLocationResult | null> {
  const url = new URL(`https://reallyfreegeoip.org/json/${encodeURIComponent(lookup.ip)}`);
  const payload = await fetchJson(url);
  const city = typeof payload?.city === "string" ? payload.city.trim() : "";
  if (city) {
    return { location: city };
  }

  const region = typeof payload?.region_name === "string" ? payload.region_name.trim() : "";
  const country = typeof payload?.country_name === "string" ? payload.country_name.trim() : "";
  const latitude = readNumber(payload?.latitude);
  const longitude = readNumber(payload?.longitude);
  const timezone = typeof payload?.time_zone === "string" ? payload.time_zone.trim() : "";
  const label = region || country || undefined;

  if (latitude !== null && longitude !== null) {
    return {
      ...(label ? { location: label } : {}),
      coordinates: {
        latitude,
        longitude,
        ...(timezone ? { timezone } : {}),
        ...(label ? { label } : {})
      }
    };
  }

  return label ? { location: label } : null;
}

async function resolveIpLocation(
  request: RootRequestContext,
  options: CreateWeatherMarkdownServerOptions
): Promise<RootIpLocationResult | null> {
  const clientIp = detectClientIp(request);
  if (!clientIp) {
    return null;
  }

  const locale = detectRequestLocale(request, request.url);
  if (options.rootLocation?.resolveIpLocation) {
    return normalizeIpLookupResult(await options.rootLocation.resolveIpLocation({ ip: clientIp, locale }));
  }

  const countryIs = await resolveCountryIsIpLocation({ ip: clientIp, locale });
  if (countryIs?.location) {
    return countryIs;
  }

  const reallyFree = await resolveReallyFreeGeoIpLocation({ ip: clientIp, locale });
  return reallyFree ?? countryIs;
}

function decodeMaybeUriComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function decodeLatin1Utf8(value: string): string {
  return Buffer.from(value, "latin1").toString("utf8");
}

function normalizeHeaderLocation(value: string): string {
  const decoded = decodeMaybeUriComponent(value.trim());
  const repaired = decodeLatin1Utf8(decoded);
  return repaired.includes("\uFFFD") ? decoded : repaired;
}

function detectEdgeLocation(request: { headers: Record<string, string | undefined> }): string | null {
  const candidates = [
    request.headers["x-dev-city"],
    request.headers["cf-ipcity"],
    request.headers["x-vercel-ip-city"],
    request.headers["x-appengine-city"],
    request.headers["x-geo-city"],
    request.headers["x-city"]
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) {
      return normalizeHeaderLocation(value);
    }
  }

  return null;
}

function parseCoordinate(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseGeoCoordinates(url: string) {
  const params = new URL(url).searchParams;
  const latitude = parseCoordinate(params.get("latitude"));
  const longitude = parseCoordinate(params.get("longitude"));
  if (latitude === null || longitude === null) {
    return null;
  }

  return {
    latitude,
    longitude,
    timezone: params.get("timezone")?.trim() || undefined,
    label: params.get("label")?.trim() || undefined
  };
}

function createGeoBootstrapPage(locale: string) {
  const zh = locale.startsWith("zh");
  const loading = zh ? "正在定位当前天气..." : "Locating current weather...";
  const denied = zh
    ? "无法获取当前位置。请允许浏览器定位，或者直接访问 /西安、/London?locale=en 这样的路径。"
    : "Unable to get your location. Allow browser location access, or open /London directly.";
  const unsupported = zh
    ? "当前浏览器不支持地理定位。请直接在地址中提供地点。"
    : "This browser does not support geolocation. Open a location path directly.";
  const script = `(() => {
const status = document.getElementById("geo-status");
const locale = ${JSON.stringify(locale)};
const denied = ${JSON.stringify(denied)};
const unsupported = ${JSON.stringify(unsupported)};
if (!("geolocation" in navigator)) {
  if (status) status.textContent = unsupported;
  return;
}
navigator.geolocation.getCurrentPosition(
  (position) => {
    const url = new URL(window.location.href);
    url.searchParams.set("latitude", String(position.coords.latitude));
    url.searchParams.set("longitude", String(position.coords.longitude));
    url.searchParams.set("locale", url.searchParams.get("locale") || locale);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timeZone) {
      url.searchParams.set("timezone", timeZone);
    }
    window.location.replace(url.toString());
  },
  () => {
    if (status) status.textContent = denied;
  },
  { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
);
})();`.replace(/\s+/g, " ");

  return {
    page: {
      frontmatter: {},
      markdown: `<div id="geo-status">${loading}</div>\n<script>${script}</script>`,
      blocks: []
    }
  };
}

function createWeatherResultSurface(markdown: string, stateId: string, route: string) {
  return {
    markdown,
    route,
    actions: {
      app_id: "weather",
      state_id: stateId,
      state_version: 1,
      blocks: [],
      actions: [],
      allowed_next_actions: []
    }
  };
}

function createWeatherErrorSurface(message: string) {
  return createWeatherResultSurface(
    `# 天气查询失败

${message}

请检查地点拼写；如果使用 \`range=daily\`，请同时提供 \`date=YYYY-MM-DD\`。`,
    "weather:error",
    "/"
  );
}

function createWeatherBriefPage(markdown: string) {
  return {
    page: {
      frontmatter: {},
      markdown,
      blocks: []
    }
  };
}

async function querySurface(
  url: string,
  provider: WeatherProvider,
  pathname: string,
  locationOverride?: string,
  localeOverride?: string
) {
  const params = new URL(url).searchParams;
  const location = locationOverride?.trim() || params.get("location")?.trim();
  const range = toRange(params.get("range"));
  const profile = resolveProfile(params.get("profile"), range);
  const locale = localeOverride ?? params.get("locale") ?? undefined;

  try {
    if (!location) {
      throw new Error("location is required");
    }

    const result = await createWeatherArtifact(
      {
        location,
        range,
        profile,
        ...(params.get("units") ? { units: params.get("units") as "metric" | "us" } : {}),
        ...(params.get("wind") ? { windUnit: params.get("wind") as "kmh" | "ms" | "mph" } : {}),
        ...(params.get("date") ? { date: params.get("date") ?? undefined } : {}),
        ...(locale ? { locale } : {})
      },
      provider
    );

    if (profile === "brief") {
      return createWeatherBriefPage(result.content);
    }

    return createWeatherResultSurface(result.content, result.stateId, pathname);
  } catch (error) {
    return createWeatherErrorSurface(error instanceof Error ? error.message : String(error));
  }
}

async function queryEventSurface(
  url: string,
  provider: WeatherProvider,
  locationOverride?: string,
  localeOverride?: string,
  coordinateOverride?: RootCoordinateTarget
) {
  const params = new URL(url).searchParams;
  const outputMode = params.get("output")?.trim().toLowerCase() ?? "";
  const boolMode = outputMode === "bool";
  const event = toEventType(params.get("event"));
  if (!event) {
    return createWeatherBriefPage(boolMode ? "false" : "NO. invalid event");
  }

  const locationName = locationOverride?.trim() || params.get("location")?.trim();
  const locale = localeOverride ?? params.get("locale") ?? undefined;
  const coordinates = coordinateOverride ?? parseGeoCoordinates(url);
  const threshold = parseThreshold(params.get("threshold"));
  const range = toRange(params.get("range"));

  try {
    const location = coordinates
      ? await provider.resolveCoordinates(coordinates, { locale })
      : locationName
        ? await provider.resolveLocation(locationName, { locale })
        : null;
    if (!location) {
      return createWeatherBriefPage(boolMode ? "false" : "NO. location is required");
    }

    const baseDate = params.get("date") ?? todayIso(location.timezone);
    const targetDate = range === "tomorrow" ? addDaysIso(baseDate, 1) : baseDate;
    const daily = await provider.getDailyForecast(location, { date: targetDate, locale: "en" });
    const condition = daily.conditionNames?.[0] ?? weatherConditionName(daily.conditionCodes?.[0] ?? -1, "en");
    const isTrue = evaluateEventBoolean(
      event,
      condition,
      daily.tempMinC[0] ?? NaN,
      daily.tempMaxC[0] ?? NaN,
      daily.precipitationProbabilityMax[0] ?? NaN,
      daily.windSpeedMaxKmh[0] ?? NaN,
      threshold
    );
    if (boolMode) {
      return createWeatherBriefPage(isTrue ? "true" : "false");
    }
    return createWeatherBriefPage(
      eventResultLine(
        locale ?? "zh-CN",
        isTrue,
        event,
        location.name,
        targetDate,
        condition,
        daily.tempMinC[0] ?? NaN,
        daily.tempMaxC[0] ?? NaN,
        daily.precipitationProbabilityMax[0] ?? NaN,
        daily.windSpeedMaxKmh[0] ?? NaN,
        threshold
      )
    );
  } catch {
    return createWeatherBriefPage(boolMode ? "false" : "NO. event query failed");
  }
}

async function queryHomeSurface(
  url: string,
  provider: WeatherProvider,
  pathname: string,
  locationOverride?: string,
  localeOverride?: string,
  coordinateOverride?: RootCoordinateTarget
) {
  const params = new URL(url).searchParams;
  const location = locationOverride?.trim() || params.get("location")?.trim();
  const coordinates = coordinateOverride ?? parseGeoCoordinates(url);
  const locale = localeOverride ?? params.get("locale") ?? undefined;

  try {
    const result = await createHomeWeatherResult(
      {
        ...(coordinates ? { coordinates } : location ? { location } : {}),
        ...(params.get("units") ? { units: params.get("units") as "metric" | "us" } : {}),
        ...(params.get("wind") ? { windUnit: params.get("wind") as "kmh" | "ms" | "mph" } : {}),
        ...(locale ? { locale } : {})
      },
      provider
    );

    return createWeatherResultSurface(result.content, result.stateId, pathname);
  } catch (error) {
    return createWeatherErrorSurface(error instanceof Error ? error.message : String(error));
  }
}

async function resolveRootTarget(
  request: RootRequestContext,
  options: CreateWeatherMarkdownServerOptions
): Promise<RootTarget> {
  const params = new URL(request.url).searchParams;
  const explicitLocation = params.get("location")?.trim();
  if (explicitLocation) {
    return { kind: "location", location: explicitLocation, source: "explicit" };
  }

  const coordinates = parseGeoCoordinates(request.url);
  if (coordinates) {
    return {
      kind: "coordinates",
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      ...(coordinates.timezone ? { timezone: coordinates.timezone } : {})
    };
  }

  const edgeLocation = detectEdgeLocation(request);
  if (edgeLocation) {
    return { kind: "location", location: edgeLocation, source: "auto" };
  }

  const ipLocation = await resolveIpLocation(request, options);
  if (ipLocation?.location) {
    return { kind: "location", location: ipLocation.location, source: "auto" };
  }
  if (ipLocation?.coordinates) {
    return {
      kind: "coordinates",
      latitude: ipLocation.coordinates.latitude,
      longitude: ipLocation.coordinates.longitude,
      ...(ipLocation.coordinates.timezone ? { timezone: ipLocation.coordinates.timezone } : {}),
      ...(ipLocation.coordinates.label ? { label: ipLocation.coordinates.label } : {})
    };
  }

  return { kind: "bootstrap" };
}

export function createWeatherMarkdownServer(
  provider: WeatherProvider = createWeatherProvider(),
  options: CreateWeatherMarkdownServerOptions = {}
) {
  const app = createApp({
    appId: "weather",
    actionProof: {
      disabled: true
    },
    browserShell: {
      title: "Weather",
      moduleMode: "local-dist"
    },
    rendering: {
      markdown: weatherMarkdownRenderer
    }
  });

  const home = app.page("/", {
    markdown: createEntryMarkdown(provider),
    actions: [
      actions.read("query_weather", {
        label: "查天气",
        target: "/",
        input: createQueryInput(provider)
      })
    ],
    render() {
      return {
        query: `默认直接返回当前天气。

快捷打开：

- /西安
- /London?locale=en
- location=西安&range=today
- location=西安&range=3d
- location=London&range=daily&date=2026-04-25
- /event?location=西安&event=rain
- /event?location=西安&event=rain&output=bool`
      };
    }
  });

  app.route("/", async ({ request }) => {
    const locale = detectRequestLocale(request, request.url);
    const rootTarget = await resolveRootTarget(request, options);
    const eventMode = hasEventQuery(request.url);
    if (eventMode) {
      if (rootTarget.kind === "coordinates") {
        return queryEventSurface(request.url, provider, undefined, locale, {
          latitude: rootTarget.latitude,
          longitude: rootTarget.longitude,
          ...(rootTarget.timezone ? { timezone: rootTarget.timezone } : {}),
          ...(rootTarget.label ? { label: rootTarget.label } : {})
        });
      }
      if (rootTarget.kind === "location") {
        return queryEventSurface(request.url, provider, rootTarget.location, locale);
      }
      return queryEventSurface(request.url, provider, undefined, locale);
    }
    if (rootTarget.kind !== "location") {
      if (prefersHtml(request)) {
        if (rootTarget.kind === "coordinates") {
          return queryHomeSurface(request.url, provider, "/", undefined, locale, {
            latitude: rootTarget.latitude,
            longitude: rootTarget.longitude,
            ...(rootTarget.timezone ? { timezone: rootTarget.timezone } : {}),
            ...(rootTarget.label ? { label: rootTarget.label } : {})
          });
        }
        return createGeoBootstrapPage(locale);
      }
      return home.render();
    }
    if (rootTarget.source === "auto") {
      return queryHomeSurface(request.url, provider, "/", rootTarget.location, locale);
    }
    return querySurface(request.url, provider, "/", rootTarget.location, locale);
  });

  app.route("/event", async ({ request }) => {
    const locale = detectRequestLocale(request, request.url);
    return queryEventSurface(request.url, provider, undefined, locale);
  });

  app.route("/:location", async ({ request, params }) =>
    querySurface(
      request.url,
      provider,
      `/${encodeURIComponent(params.location)}`,
      params.location,
      detectRequestLocale(request, request.url)
    )
  );

  return app;
}
