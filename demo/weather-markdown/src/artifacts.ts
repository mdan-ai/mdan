import {
  compileCurrentWeatherMarkdown,
  compileForecastMarkdown,
  type DailyForecastRow,
  type WeatherProfile,
  type WeatherUnits,
  type WindUnit
} from "./markdown.js";
import {
  createOpenMeteoProvider,
  weatherConditionName,
  weatherSourceName,
  type DailyForecastData,
  type WeatherProvider
} from "./open-meteo.js";

export type WeatherRange = "current" | "daily" | "today" | "tomorrow" | "3d" | "7d";

export interface WeatherArtifactRequest {
  location: string;
  range: WeatherRange;
  profile?: WeatherProfile;
  units?: WeatherUnits;
  windUnit?: WindUnit;
  emoji?: boolean;
  date?: string;
  locale?: string;
}

export interface WeatherArtifactResult {
  content: string;
  location: string;
  stateId: string;
}

function firstDailyRow(data: DailyForecastData, locale: string): DailyForecastRow {
  return {
    date: data.dates[0] ?? "",
    condition: weatherConditionName(data.conditionCodes[0] ?? -1, locale),
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
    condition: weatherConditionName(data.conditionCodes[index] ?? -1, locale),
    conditionCode: data.conditionCodes[index] ?? -1,
    tempMinC: data.tempMinC[index] ?? 0,
    tempMaxC: data.tempMaxC[index] ?? 0,
    precipitationProbabilityMax: data.precipitationProbabilityMax[index] ?? 0,
    windSpeedMaxKmh: data.windSpeedMaxKmh[index] ?? 0
  }));
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
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

function forecastMeta(request: WeatherArtifactRequest, location: { timezone: string }) {
  return {
    source: weatherSourceName,
    sourceUrl: "https://open-meteo.com/",
    geocodingSource: "Open-Meteo Geocoding",
    service: "MDAN Weather",
    serviceUrl: "https://docs.mdan.ai",
    generatedAt: generatedAt(location),
    locale: request.locale ?? "zh-CN",
    units: request.units ?? "metric",
    windUnit: request.windUnit ?? "kmh",
    profile: request.profile ?? "table",
    emoji: request.emoji ?? true
  };
}

export async function createWeatherArtifact(
  request: WeatherArtifactRequest,
  provider: WeatherProvider = createOpenMeteoProvider()
): Promise<WeatherArtifactResult> {
  const locale = request.locale ?? "zh-CN";
  const location = await provider.resolveLocation(request.location);
  const meta = forecastMeta(request, location);

  if (request.range === "current") {
    const weather = await provider.getCurrentWeather(location);
    return {
      location: location.name,
      stateId: `weather:${slug(location.name)}:current`,
      content: compileCurrentWeatherMarkdown({
        location: location.name,
        condition: weatherConditionName(weather.conditionCode, locale),
        conditionCode: weather.conditionCode,
        temperatureC: weather.temperatureC,
        apparentTemperatureC: weather.apparentTemperatureC,
        humidityPercent: weather.humidityPercent,
        windSpeedKmh: weather.windSpeedKmh,
        source: weatherSourceName,
        sourceUrl: meta.sourceUrl,
        geocodingSource: meta.geocodingSource,
        service: meta.service,
        serviceUrl: meta.serviceUrl,
        generatedAt: meta.generatedAt,
        units: meta.units,
        windUnit: meta.windUnit,
        emoji: meta.emoji
      })
    };
  }

  if (request.range === "daily" || request.range === "today" || request.range === "tomorrow") {
    const date = request.date ?? todayIso();
    const targetDate = request.range === "tomorrow" ? addDaysIso(date, 1) : date;
    const data = await provider.getDailyForecast(location, { date: targetDate });
    const row = firstDailyRow(data, locale);
    const title =
      request.range === "tomorrow"
        ? `${location.name}明天天气`
        : request.range === "today"
          ? `${location.name}今天天气`
          : `${location.name} ${row.date || targetDate} 天气`;
    return {
      location: location.name,
      stateId: `weather:${slug(location.name)}:${row.date || targetDate}:${request.range}`,
      content: compileForecastMarkdown({
        location: location.name,
        title,
        rows: [row],
        ...meta
      })
    };
  }

  const data = await provider.getSevenDayForecast(location);
  const rows = dailyRows(data, locale).slice(0, request.range === "3d" ? 3 : 7);
  return {
    location: location.name,
    stateId: `weather:${slug(location.name)}:${request.range}`,
    content: compileForecastMarkdown({
      location: location.name,
      title: `${location.name} ${request.range === "3d" ? "3" : "7"} 日天气预报`,
      rows,
      ...meta
    })
  };
}
