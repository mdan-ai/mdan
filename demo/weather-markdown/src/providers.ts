import { createOpenMeteoProvider } from "./open-meteo.js";
import { createWeatherApiProvider } from "./weatherapi.js";
import type { WeatherProvider } from "./weather-provider.js";

export type WeatherProviderName = "open-meteo" | "weatherapi";

export interface CreateWeatherProviderOptions {
  provider?: WeatherProviderName;
  weatherApiKey?: string;
}

function readWeatherProviderName(): WeatherProviderName | undefined {
  const provider = process.env.WEATHER_PROVIDER?.trim().toLowerCase();
  if (!provider) {
    return undefined;
  }
  if (provider === "open-meteo" || provider === "weatherapi") {
    return provider;
  }
  throw new Error("WEATHER_PROVIDER must be open-meteo or weatherapi.");
}

function readWeatherApiKey(): string | undefined {
  return process.env.WEATHERAPI_KEY?.trim() || process.env.WEATHER_API_KEY?.trim() || undefined;
}

export function createWeatherProvider(options: CreateWeatherProviderOptions = {}): WeatherProvider {
  const weatherApiKey = options.weatherApiKey?.trim() || readWeatherApiKey();
  const provider = options.provider ?? readWeatherProviderName() ?? (weatherApiKey ? "weatherapi" : "open-meteo");

  if (provider === "weatherapi") {
    if (!weatherApiKey) {
      throw new Error("WEATHERAPI_KEY is required when WEATHER_PROVIDER=weatherapi.");
    }
    return createWeatherApiProvider({ apiKey: weatherApiKey });
  }

  return createOpenMeteoProvider();
}
