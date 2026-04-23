import { afterEach, describe, expect, test, vi } from "vitest";

import { createHomeWeatherResult, createWeatherArtifact } from "../src/artifacts.ts";
import { createWeatherProvider } from "../src/providers.ts";
import { createWeatherApiProvider } from "../src/weatherapi.ts";

const forecastPayload = {
  location: {
    name: "London",
    lat: 51.52,
    lon: -0.11,
    tz_id: "Europe/London"
  },
  current: {
    temp_c: 14,
    feelslike_c: 13,
    humidity: 70,
    wind_kph: 12,
    condition: {
      text: "Partly cloudy",
      code: 1003
    }
  },
  forecast: {
    forecastday: [
      {
        date: "2026-04-23",
        day: {
          maxtemp_c: 16,
          mintemp_c: 9,
          maxwind_kph: 15,
          daily_chance_of_rain: 10,
          condition: {
            text: "Partly cloudy",
            code: 1003
          }
        }
      },
      {
        date: "2026-04-24",
        day: {
          maxtemp_c: 18,
          mintemp_c: 10,
          maxwind_kph: 20,
          daily_chance_of_rain: 70,
          condition: {
            text: "Patchy rain nearby",
            code: 1063
          }
        }
      },
      {
        date: "2026-04-25",
        day: {
          maxtemp_c: 19,
          mintemp_c: 11,
          maxwind_kph: 18,
          daily_chance_of_rain: 20,
          condition: {
            text: "Sunny",
            code: 1000
          }
        }
      }
    ]
  }
};

describe("WeatherAPI.com provider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.WEATHER_PROVIDER;
    delete process.env.WEATHERAPI_KEY;
    delete process.env.WEATHER_API_KEY;
  });

  test("feeds WeatherAPI forecast data into the home weather view", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      async json() {
        return forecastPayload;
      }
    } as Response);

    const provider = createWeatherApiProvider({ apiKey: "test-key" });
    const result = await createHomeWeatherResult({ location: "London", locale: "en" }, provider);

    expect(fetchMock.mock.calls.length).toBe(2);
    const resolveUrl = fetchMock.mock.calls[0]?.[0] as URL;
    expect(resolveUrl.origin).toBe("https://api.weatherapi.com");
    expect(resolveUrl.pathname).toBe("/v1/forecast.json");
    expect(resolveUrl.searchParams.get("key")).toBe("test-key");
    expect(resolveUrl.searchParams.get("q")).toBe("London");
    expect(resolveUrl.searchParams.get("days")).toBe("1");

    const forecastUrl = fetchMock.mock.calls[1]?.[0] as URL;
    expect(forecastUrl.searchParams.get("q")).toBe("51.52,-0.11");
    expect(forecastUrl.searchParams.get("days")).toBe("3");

    expect(result.content).toContain("Today in London: ⛅ Partly cloudy");
    expect(result.content).toContain("| 2026-04-24 | 🌧 Patchy rain nearby |");
    expect(result.content).toContain("Source: [WeatherAPI.com](https://www.weatherapi.com/)");
  });

  test("selects WeatherAPI from env only when configured", () => {
    process.env.WEATHERAPI_KEY = "test-key";
    expect(createWeatherProvider().source.name).toBe("WeatherAPI.com");

    process.env.WEATHER_PROVIDER = "open-meteo";
    expect(createWeatherProvider().source.name).toBe("Open-Meteo");
  });

  test("requires a key when WeatherAPI is forced", () => {
    process.env.WEATHER_PROVIDER = "weatherapi";
    expect(() => createWeatherProvider()).toThrow("WEATHERAPI_KEY is required");
  });

  test("rejects unsupported seven day forecasts for the free WeatherAPI provider", async () => {
    const provider = createWeatherApiProvider({ apiKey: "test-key" });
    await expect(createWeatherArtifact({ location: "London", range: "7d", locale: "en" }, provider)).rejects.toThrow(
      "WeatherAPI.com supports up to 3 forecast days"
    );
  });
});
