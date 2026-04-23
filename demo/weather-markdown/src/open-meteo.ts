import type {
  CoordinateLookup,
  CurrentWeatherData,
  DailyForecastData,
  ResolvedLocation,
  WeatherProvider
} from "./weather-provider.js";

const SOURCE = "Open-Meteo";

const knownLocations: Record<string, ResolvedLocation> = {
  "西安": {
    name: "西安",
    latitude: 34.3416,
    longitude: 108.9398,
    timezone: "Asia/Shanghai"
  },
  xian: {
    name: "西安",
    latitude: 34.3416,
    longitude: 108.9398,
    timezone: "Asia/Shanghai"
  },
  "xi'an": {
    name: "西安",
    latitude: 34.3416,
    longitude: 108.9398,
    timezone: "Asia/Shanghai"
  }
};

function asNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Open-Meteo response missing numeric field: ${field}`);
  }
  return value;
}

function asNumberArray(value: unknown, field: string): number[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "number" || !Number.isFinite(entry))) {
    throw new Error(`Open-Meteo response missing numeric array field: ${field}`);
  }
  return value as number[];
}

function asStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`Open-Meteo response missing string array field: ${field}`);
  }
  return value as string[];
}

async function fetchJson(url: URL): Promise<Record<string, unknown>> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo request failed: ${response.status}`);
  }
  const data = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Open-Meteo response must be an object.");
  }
  return data as Record<string, unknown>;
}

function dailyFromPayload(payload: Record<string, unknown>): DailyForecastData {
  const daily = payload.daily;
  if (!daily || typeof daily !== "object" || Array.isArray(daily)) {
    throw new Error("Open-Meteo response missing daily forecast.");
  }
  const values = daily as Record<string, unknown>;
  return {
    dates: asStringArray(values.time, "daily.time"),
    conditionCodes: asNumberArray(values.weather_code, "daily.weather_code"),
    tempMaxC: asNumberArray(values.temperature_2m_max, "daily.temperature_2m_max"),
    tempMinC: asNumberArray(values.temperature_2m_min, "daily.temperature_2m_min"),
    precipitationProbabilityMax: asNumberArray(
      values.precipitation_probability_max,
      "daily.precipitation_probability_max"
    ),
    windSpeedMaxKmh: asNumberArray(values.wind_speed_10m_max, "daily.wind_speed_10m_max")
  };
}

export function weatherConditionName(code: number, locale = "zh-CN"): string {
  const zh: Record<number, string> = {
    0: "晴",
    1: "大部晴朗",
    2: "局部多云",
    3: "阴",
    45: "雾",
    48: "雾凇",
    51: "小毛毛雨",
    53: "毛毛雨",
    55: "较强毛毛雨",
    56: "冻毛毛雨",
    57: "较强冻毛毛雨",
    61: "小雨",
    63: "雨",
    65: "大雨",
    66: "冻雨",
    67: "强冻雨",
    71: "小雪",
    73: "雪",
    75: "大雪",
    77: "雪粒",
    80: "阵雨",
    81: "较强阵雨",
    82: "强阵雨",
    85: "阵雪",
    86: "强阵雪",
    95: "雷暴",
    96: "雷暴伴小冰雹",
    99: "雷暴伴冰雹"
  };
  const en: Record<number, string> = {
    0: "Clear",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Dense drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Heavy rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm"
  };
  return (locale.startsWith("zh") ? zh : en)[code] ?? `天气代码 ${code}`;
}

export function createOpenMeteoProvider(): WeatherProvider {
  return {
    source: {
      name: SOURCE,
      url: "https://open-meteo.com/",
      geocodingName: "Open-Meteo Geocoding"
    },
    capabilities: {
      maxForecastDays: 7
    },
    async resolveLocation(location: string, options?: { locale?: string }): Promise<ResolvedLocation> {
      const normalized = location.trim().toLowerCase();
      const known = knownLocations[normalized];
      if (known) {
        if ((options?.locale ?? "zh-CN").startsWith("zh")) {
          return known;
        }

        return {
          ...known,
          name: "Xi'an"
        };
      }

      const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
      url.searchParams.set("name", location);
      url.searchParams.set("count", "1");
      url.searchParams.set("language", (options?.locale ?? "zh-CN").startsWith("zh") ? "zh" : "en");
      url.searchParams.set("format", "json");
      const payload = await fetchJson(url);
      const results = payload.results;
      if (!Array.isArray(results) || results.length === 0) {
        throw new Error(`Location not found: ${location}`);
      }
      const first = results[0] as Record<string, unknown>;
      return {
        name: typeof first.name === "string" ? first.name : location,
        latitude: asNumber(first.latitude, "latitude"),
        longitude: asNumber(first.longitude, "longitude"),
        timezone: typeof first.timezone === "string" ? first.timezone : "auto"
      };
    },
    async resolveCoordinates(coordinates: CoordinateLookup, options?: { locale?: string }): Promise<ResolvedLocation> {
      const locale = options?.locale ?? "zh-CN";
      return {
        name: coordinates.label ?? (locale.startsWith("zh") ? "这里" : "Here"),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        timezone: coordinates.timezone?.trim() || "auto"
      };
    },
    async getCurrentWeather(location: ResolvedLocation): Promise<CurrentWeatherData> {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", String(location.latitude));
      url.searchParams.set("longitude", String(location.longitude));
      url.searchParams.set(
        "current",
        "weather_code,temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m"
      );
      url.searchParams.set("timezone", location.timezone);
      const payload = await fetchJson(url);
      const current = payload.current;
      if (!current || typeof current !== "object" || Array.isArray(current)) {
        throw new Error("Open-Meteo response missing current weather.");
      }
      const values = current as Record<string, unknown>;
      return {
        conditionCode: asNumber(values.weather_code, "current.weather_code"),
        temperatureC: asNumber(values.temperature_2m, "current.temperature_2m"),
        apparentTemperatureC: asNumber(values.apparent_temperature, "current.apparent_temperature"),
        humidityPercent: asNumber(values.relative_humidity_2m, "current.relative_humidity_2m"),
        windSpeedKmh: asNumber(values.wind_speed_10m, "current.wind_speed_10m")
      };
    },
    async getDailyForecast(location: ResolvedLocation, options: { date: string }): Promise<DailyForecastData> {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", String(location.latitude));
      url.searchParams.set("longitude", String(location.longitude));
      url.searchParams.set(
        "daily",
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max"
      );
      url.searchParams.set("timezone", location.timezone);
      url.searchParams.set("start_date", options.date);
      url.searchParams.set("end_date", options.date);
      return dailyFromPayload(await fetchJson(url));
    },
    async getForecast(location: ResolvedLocation, options?: { days?: number }): Promise<DailyForecastData> {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", String(location.latitude));
      url.searchParams.set("longitude", String(location.longitude));
      url.searchParams.set(
        "daily",
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max"
      );
      url.searchParams.set("timezone", location.timezone);
      url.searchParams.set("forecast_days", String(options?.days ?? 7));
      return dailyFromPayload(await fetchJson(url));
    }
  };
}

export const weatherSourceName = SOURCE;
