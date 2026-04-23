import type {
  CoordinateLookup,
  CurrentWeatherData,
  DailyForecastData,
  ResolvedLocation,
  WeatherProvider
} from "./weather-provider.js";

const SOURCE = "WeatherAPI.com";
const BASE_URL = "https://api.weatherapi.com/v1";

export interface CreateWeatherApiProviderOptions {
  apiKey: string;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`WeatherAPI response missing string field: ${field}`);
  }
  return value;
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`WeatherAPI response missing numeric field: ${field}`);
  }
  return value;
}

function optionalNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function localeToWeatherApiLang(locale?: string): string | undefined {
  if (!locale) {
    return undefined;
  }
  if (locale.startsWith("zh")) {
    return "zh";
  }
  if (locale.startsWith("en")) {
    return undefined;
  }
  return locale.split("-")[0];
}

function weatherQuery(location: ResolvedLocation): string {
  return `${location.latitude},${location.longitude}`;
}

function coordinateQuery(coordinates: CoordinateLookup): string {
  return `${coordinates.latitude},${coordinates.longitude}`;
}

function createUrl(path: string, apiKey: string, params: Record<string, string | undefined>) {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("key", apiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  return url;
}

async function fetchJson(url: URL): Promise<Record<string, unknown>> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`WeatherAPI request failed: ${response.status}`);
  }
  const data = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("WeatherAPI response must be an object.");
  }
  return data as Record<string, unknown>;
}

function locationFromPayload(payload: Record<string, unknown>, fallbackName: string): ResolvedLocation {
  const location = payload.location;
  if (!location || typeof location !== "object" || Array.isArray(location)) {
    throw new Error("WeatherAPI response missing location.");
  }
  const values = location as Record<string, unknown>;
  return {
    name: typeof values.name === "string" && values.name.trim() ? values.name : fallbackName,
    latitude: requireNumber(values.lat, "location.lat"),
    longitude: requireNumber(values.lon, "location.lon"),
    timezone: typeof values.tz_id === "string" && values.tz_id.trim() ? values.tz_id : "auto"
  };
}

function conditionFrom(value: unknown): { text?: string; code: number } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { code: -1 };
  }
  const condition = value as Record<string, unknown>;
  const weatherApiCode = typeof condition.code === "number" && Number.isFinite(condition.code) ? condition.code : -1;
  return {
    text: typeof condition.text === "string" && condition.text.trim() ? condition.text : undefined,
    code: weatherApiCodeToWeatherCode(weatherApiCode)
  };
}

function weatherApiCodeToWeatherCode(code: number): number {
  if (code === 1000) return 0;
  if (code === 1003) return 2;
  if (code === 1006 || code === 1009) return 3;
  if (code === 1030 || code === 1135 || code === 1147) return 45;
  if ([1063, 1150, 1153, 1168, 1171, 1180, 1183, 1186, 1189, 1192, 1195, 1198, 1201, 1240, 1243, 1246].includes(code)) {
    return 63;
  }
  if ([1066, 1069, 1072, 1114, 1117, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1249, 1252, 1255, 1258, 1261, 1264].includes(code)) {
    return 73;
  }
  if ([1087, 1273, 1276, 1279, 1282].includes(code)) {
    return 95;
  }
  return -1;
}

function currentFromPayload(payload: Record<string, unknown>): CurrentWeatherData {
  const current = payload.current;
  if (!current || typeof current !== "object" || Array.isArray(current)) {
    throw new Error("WeatherAPI response missing current weather.");
  }
  const values = current as Record<string, unknown>;
  const condition = conditionFrom(values.condition);
  return {
    ...(condition.text ? { condition: condition.text } : {}),
    conditionCode: condition.code,
    temperatureC: requireNumber(values.temp_c, "current.temp_c"),
    apparentTemperatureC: requireNumber(values.feelslike_c, "current.feelslike_c"),
    humidityPercent: requireNumber(values.humidity, "current.humidity"),
    windSpeedKmh: requireNumber(values.wind_kph, "current.wind_kph")
  };
}

function forecastFromPayload(payload: Record<string, unknown>): DailyForecastData {
  const forecast = payload.forecast;
  if (!forecast || typeof forecast !== "object" || Array.isArray(forecast)) {
    throw new Error("WeatherAPI response missing forecast.");
  }
  const days = (forecast as Record<string, unknown>).forecastday;
  if (!Array.isArray(days)) {
    throw new Error("WeatherAPI response missing forecast days.");
  }

  const dates: string[] = [];
  const conditionNames: string[] = [];
  const conditionCodes: number[] = [];
  const tempMaxC: number[] = [];
  const tempMinC: number[] = [];
  const precipitationProbabilityMax: number[] = [];
  const windSpeedMaxKmh: number[] = [];

  for (const entry of days) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const values = entry as Record<string, unknown>;
    const day = values.day;
    if (!day || typeof day !== "object" || Array.isArray(day)) {
      continue;
    }
    const dayValues = day as Record<string, unknown>;
    const condition = conditionFrom(dayValues.condition);
    dates.push(requireString(values.date, "forecastday.date"));
    conditionNames.push(condition.text ?? "");
    conditionCodes.push(condition.code);
    tempMaxC.push(requireNumber(dayValues.maxtemp_c, "forecastday.day.maxtemp_c"));
    tempMinC.push(requireNumber(dayValues.mintemp_c, "forecastday.day.mintemp_c"));
    precipitationProbabilityMax.push(optionalNumber(dayValues.daily_chance_of_rain));
    windSpeedMaxKmh.push(requireNumber(dayValues.maxwind_kph, "forecastday.day.maxwind_kph"));
  }

  return {
    dates,
    conditionNames,
    conditionCodes,
    tempMaxC,
    tempMinC,
    precipitationProbabilityMax,
    windSpeedMaxKmh
  };
}

export function createWeatherApiProvider(options: CreateWeatherApiProviderOptions): WeatherProvider {
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    throw new Error("WeatherAPI provider requires an apiKey.");
  }

  return {
    source: {
      name: SOURCE,
      url: "https://www.weatherapi.com/",
      geocodingName: "WeatherAPI.com"
    },
    capabilities: {
      maxForecastDays: 3
    },
    async resolveLocation(location: string, requestOptions?: { locale?: string }): Promise<ResolvedLocation> {
      const url = createUrl("/forecast.json", apiKey, {
        q: location,
        days: "1",
        aqi: "no",
        alerts: "no",
        lang: localeToWeatherApiLang(requestOptions?.locale)
      });
      return locationFromPayload(await fetchJson(url), location);
    },
    async resolveCoordinates(coordinates: CoordinateLookup, requestOptions?: { locale?: string }): Promise<ResolvedLocation> {
      const url = createUrl("/forecast.json", apiKey, {
        q: coordinateQuery(coordinates),
        days: "1",
        aqi: "no",
        alerts: "no",
        lang: localeToWeatherApiLang(requestOptions?.locale)
      });
      const resolved = locationFromPayload(await fetchJson(url), coordinates.label ?? coordinateQuery(coordinates));
      return coordinates.label ? { ...resolved, name: coordinates.label } : resolved;
    },
    async getCurrentWeather(location: ResolvedLocation, requestOptions?: { locale?: string }): Promise<CurrentWeatherData> {
      const url = createUrl("/current.json", apiKey, {
        q: weatherQuery(location),
        aqi: "no",
        lang: localeToWeatherApiLang(requestOptions?.locale)
      });
      return currentFromPayload(await fetchJson(url));
    },
    async getDailyForecast(
      location: ResolvedLocation,
      requestOptions: { date: string; locale?: string }
    ): Promise<DailyForecastData> {
      const url = createUrl("/forecast.json", apiKey, {
        q: weatherQuery(location),
        days: "1",
        dt: requestOptions.date,
        aqi: "no",
        alerts: "no",
        lang: localeToWeatherApiLang(requestOptions.locale)
      });
      return forecastFromPayload(await fetchJson(url));
    },
    async getForecast(location: ResolvedLocation, requestOptions?: { days?: number; locale?: string }): Promise<DailyForecastData> {
      const url = createUrl("/forecast.json", apiKey, {
        q: weatherQuery(location),
        days: String(requestOptions?.days ?? 3),
        aqi: "no",
        alerts: "no",
        lang: localeToWeatherApiLang(requestOptions?.locale)
      });
      return forecastFromPayload(await fetchJson(url));
    }
  };
}

export const weatherApiSourceName = SOURCE;
