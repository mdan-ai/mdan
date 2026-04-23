import {
  compileHomeForecastMarkdown,
  compileCurrentWeatherMarkdown,
  compileForecastMarkdown,
  type DailyForecastRow,
  type WeatherProfile,
  type WeatherUnits,
  type WindUnit
} from "./markdown.js";
import { createWeatherProvider } from "./providers.js";
import { weatherConditionName } from "./open-meteo.js";
import type {
  CoordinateLookup,
  DailyForecastData,
  WeatherProvider
} from "./weather-provider.js";

export type WeatherRange = "current" | "daily" | "today" | "tomorrow" | "3d" | "7d";

export interface WeatherArtifactRequest {
  location?: string;
  coordinates?: CoordinateLookup;
  range: WeatherRange;
  profile?: WeatherProfile;
  units?: WeatherUnits;
  windUnit?: WindUnit;
  date?: string;
  locale?: string;
}

export interface WeatherArtifactResult {
  content: string;
  location: string;
  stateId: string;
}

export interface HomeWeatherResult {
  content: string;
  location: string;
  stateId: string;
}

function firstDailyRow(data: DailyForecastData, locale: string): DailyForecastRow {
  return {
    date: data.dates[0] ?? "",
    condition: data.conditionNames?.[0] || weatherConditionName(data.conditionCodes[0] ?? -1, locale),
    conditionCode: data.conditionCodes[0] ?? -1,
    tempMinC: data.tempMinC[0] ?? 0,
    tempMaxC: data.tempMaxC[0] ?? 0,
    precipitationProbabilityMax: data.precipitationProbabilityMax[0] ?? 0,
    windSpeedMaxKmh: data.windSpeedMaxKmh[0] ?? 0
  };
}

function dailyRows(data: DailyForecastData, locale: string): DailyForecastRow[] {
  return data.dates.map((date, index) => ({
    date,
    condition: data.conditionNames?.[index] || weatherConditionName(data.conditionCodes[index] ?? -1, locale),
    conditionCode: data.conditionCodes[index] ?? -1,
    tempMinC: data.tempMinC[index] ?? 0,
    tempMaxC: data.tempMaxC[index] ?? 0,
    precipitationProbabilityMax: data.precipitationProbabilityMax[index] ?? 0,
    windSpeedMaxKmh: data.windSpeedMaxKmh[index] ?? 0
  }));
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

function generatedAt(location: { timezone: string }): string {
  const now = new Date();
  const timeZone = location.timezone === "auto" ? "UTC" : location.timezone;
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(now);
  return `${parts} ${timeZone}`;
}

function slug(value: string): string {
  return encodeURIComponent(value.trim().toLowerCase()).replace(/%/g, "");
}

function isZhLocale(locale: string): boolean {
  return locale.startsWith("zh");
}

function hasLatinLetters(value: string): boolean {
  return /[A-Za-z]/.test(value);
}

function displayLocationName(requested: string, resolved: string, locale: string): string {
  if (!isZhLocale(locale) && hasLatinLetters(requested)) {
    return requested.trim();
  }

  return resolved;
}

function forecastMeta(request: WeatherArtifactRequest, location: { timezone: string }, provider: WeatherProvider) {
  return {
    source: provider.source.name,
    sourceUrl: provider.source.url,
    geocodingSource: provider.source.geocodingName,
    service: "MDAN Weather",
    serviceUrl: "https://docs.mdan.ai",
    generatedAt: generatedAt(location),
    locale: request.locale ?? "zh-CN",
    units: request.units ?? "metric",
    windUnit: request.windUnit ?? "kmh",
    profile: request.profile ?? "table",
    emoji: true
  };
}

function requestedForecastDays(range: WeatherRange): number {
  return range === "3d" ? 3 : 7;
}

function assertForecastRangeSupported(range: WeatherRange, provider: WeatherProvider) {
  if (range !== "3d" && range !== "7d") {
    return;
  }

  const days = requestedForecastDays(range);
  if (days > provider.capabilities.maxForecastDays) {
    throw new Error(`${provider.source.name} supports up to ${provider.capabilities.maxForecastDays} forecast days.`);
  }
}

export async function createWeatherArtifact(
  request: WeatherArtifactRequest,
  provider: WeatherProvider = createWeatherProvider()
): Promise<WeatherArtifactResult> {
  const locale = request.locale ?? "zh-CN";
  assertForecastRangeSupported(request.range, provider);
  const location = request.coordinates
    ? await provider.resolveCoordinates(request.coordinates, { locale })
    : request.location
      ? await provider.resolveLocation(request.location, { locale })
      : null;
  if (!location) {
    throw new Error("location is required");
  }
  const locationName = request.coordinates
    ? location.name
    : displayLocationName(request.location ?? "", location.name, locale);
  const meta = forecastMeta(request, location, provider);

  if (request.range === "current") {
    const weather = await provider.getCurrentWeather(location, { locale });
    return {
      location: locationName,
      stateId: `weather:${slug(locationName)}:current`,
      content: compileCurrentWeatherMarkdown({
        location: locationName,
        condition: weather.condition || weatherConditionName(weather.conditionCode, locale),
        conditionCode: weather.conditionCode,
        temperatureC: weather.temperatureC,
        apparentTemperatureC: weather.apparentTemperatureC,
        humidityPercent: weather.humidityPercent,
        windSpeedKmh: weather.windSpeedKmh,
        source: meta.source,
        sourceUrl: meta.sourceUrl,
        geocodingSource: meta.geocodingSource,
        service: meta.service,
        serviceUrl: meta.serviceUrl,
        generatedAt: meta.generatedAt,
        locale: meta.locale,
        profile: meta.profile,
        units: meta.units,
        windUnit: meta.windUnit,
        emoji: meta.emoji
      })
    };
  }

  if (request.range === "daily" || request.range === "today" || request.range === "tomorrow") {
    if (request.range === "daily" && !request.date) {
      throw new Error("range=daily requires date=YYYY-MM-DD");
    }

    const date = request.date ?? todayIso(location.timezone);
    const targetDate = request.range === "tomorrow" ? addDaysIso(date, 1) : date;
    const data = await provider.getDailyForecast(location, { date: targetDate, locale });
    const row = firstDailyRow(data, locale);
    const zh = isZhLocale(locale);
    const title =
      request.range === "tomorrow"
        ? zh
          ? `${locationName}明天天气`
          : `Tomorrow in ${locationName}`
        : request.range === "today"
          ? zh
            ? `${locationName}今天天气`
            : `Today in ${locationName}`
          : zh
            ? `${locationName} ${row.date || targetDate} 天气`
            : `Weather in ${locationName} on ${row.date || targetDate}`;
    return {
      location: locationName,
      stateId: `weather:${slug(locationName)}:${row.date || targetDate}:${request.range}`,
      content: compileForecastMarkdown({
        location: locationName,
        title,
        rows: [row],
        ...meta
      })
    };
  }

  const days = requestedForecastDays(request.range);
  const data = await provider.getForecast(location, { days, locale });
  const rows = dailyRows(data, locale).slice(0, days);
  const zh = isZhLocale(locale);
  return {
    location: locationName,
    stateId: `weather:${slug(locationName)}:${request.range}`,
    content: compileForecastMarkdown({
      location: locationName,
      title: zh
        ? `${locationName} ${request.range === "3d" ? "3" : "7"} 日天气预报`
        : `${locationName} ${request.range === "3d" ? "3-day" : "7-day"} forecast`,
      rows,
      ...meta
    })
  };
}

export async function createHomeWeatherResult(
  request: Omit<WeatherArtifactRequest, "range" | "profile">,
  provider: WeatherProvider = createWeatherProvider()
): Promise<HomeWeatherResult> {
  const locale = request.locale ?? "zh-CN";
  const location = request.coordinates
    ? await provider.resolveCoordinates(request.coordinates, { locale })
    : request.location
      ? await provider.resolveLocation(request.location, { locale })
      : null;
  if (!location) {
    throw new Error("location is required");
  }

  const locationName = request.coordinates
    ? location.name
    : displayLocationName(request.location ?? "", location.name, locale);
  const meta = forecastMeta({ ...request, range: "3d", profile: "full" }, location, provider);
  const data = await provider.getForecast(location, { days: 3, locale });
  const rows = dailyRows(data, locale).slice(0, 3);

  return {
    location: locationName,
    stateId: `weather:${slug(locationName)}:home`,
    content: compileHomeForecastMarkdown({
      location: locationName,
      rows,
      source: meta.source,
      sourceUrl: meta.sourceUrl,
      service: meta.service,
      serviceUrl: meta.serviceUrl,
      generatedAt: meta.generatedAt,
      locale: meta.locale,
      units: meta.units,
      windUnit: meta.windUnit,
      emoji: meta.emoji
    })
  };
}
