import { afterEach, describe, expect, test, vi } from "vitest";

import { createWeatherMarkdownServer } from "../app.ts";
import { createWeatherArtifact } from "../src/artifacts.ts";
import type { WeatherProvider } from "../src/weather-provider.ts";

const provider: WeatherProvider = {
  source: {
    name: "Open-Meteo",
    url: "https://open-meteo.com/",
    geocodingName: "Open-Meteo Geocoding"
  },
  capabilities: {
    maxForecastDays: 7
  },
  async resolveLocation(location, options) {
    if (location === "London") {
      return {
        name: (options?.locale ?? "zh-CN").startsWith("zh") ? "伦敦" : "London",
        latitude: 51.5072,
        longitude: -0.1276,
        timezone: "Europe/London"
      };
    }

    return {
      name: "西安",
      latitude: 34.3416,
      longitude: 108.9398,
      timezone: "Asia/Shanghai"
    };
  },
  async resolveCoordinates(coordinates, options) {
    return {
      name: (options?.locale ?? "zh-CN").startsWith("zh") ? "这里" : "Here",
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      timezone: coordinates.timezone ?? "Asia/Shanghai"
    };
  },
  async getCurrentWeather() {
    return {
      conditionCode: 2,
      temperatureC: 16,
      apparentTemperatureC: 16,
      humidityPercent: 42,
      windSpeedKmh: 8
    };
  },
  async getDailyForecast() {
    return {
      dates: ["2026-04-20"],
      conditionCodes: [63],
      tempMaxC: [16.9],
      tempMinC: [10.7],
      precipitationProbabilityMax: [93],
      windSpeedMaxKmh: [17.3]
    };
  },
  async getForecast() {
    return {
      dates: ["2026-04-20", "2026-04-21", "2026-04-22", "2026-04-23"],
      conditionCodes: [63, 0, 2, 80],
      tempMaxC: [16.9, 23.1, 25.2, 19.4],
      tempMinC: [10.7, 12, 13.4, 11.1],
      precipitationProbabilityMax: [93, 3, 10, 50],
      windSpeedMaxKmh: [17.3, 12.5, 8.4, 22.1]
    };
  }
};

describe("weather markdown demo server", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  test("returns a directly deliverable markdown artifact", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/?location=西安&range=7d",
      headers: {
        accept: "text/markdown"
      }
    });

    expect(response.headers["content-type"]).toContain("text/markdown");
    expect(response.body).toContain("# 西安 7 日天气预报");
    expect(response.body).toContain("| 2026-04-20 | 🌧 雨 | 10.7°C | 16.9°C | 93% | 17.3 km/h |");
    expect(response.body).toContain(
      "来源：[Open-Meteo](https://open-meteo.com/)"
    );
    expect(response.body).not.toContain("## 来源与生成");
    expect(response.body).toContain("```mdan");
    expect(response.body).toContain('"app_id": "weather"');
    expect(response.body).toContain('"state_id": "weather:E8A5BFE5AE89:7d"');
  });

  test("returns a brief tomorrow artifact for agent handoff", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/?location=西安&range=tomorrow&profile=brief&wind=ms",
      headers: {
        accept: "text/markdown"
      }
    });

    expect(response.headers["content-type"]).toContain("text/markdown");
    expect(response.body.trim()).toBe("西安明天：🌧 雨，10.7-16.9°C，最高降水概率 93%，最大风速 4.8 m/s。");
    expect(response.body).not.toContain("## 来源与生成");
    expect(response.body).not.toContain("```mdan");
  });

  test("returns current weather as a single wttr-like line in brief mode", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/?location=西安&range=current&profile=brief",
      headers: {
        accept: "text/markdown"
      }
    });

    expect(response.body.trim()).toBe("西安当前⛅ 局部多云，16.0°C，体感 16.0°C。湿度 42%，风速 8.0 km/h。");
    expect(response.body).not.toContain("## 来源与生成");
    expect(response.body).not.toContain("```mdan");
  });

  test("returns english page copy with english location names when locale=en", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/?location=London&locale=en",
      headers: {
        accept: "text/markdown"
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.trim()).toBe(
      "Current weather in London: ⛅ Partly cloudy, 16.0°C, feels like 16.0°C. Humidity 42%, wind 8.0 km/h."
    );
    expect(response.body).not.toContain("Current weather in 伦敦");
  });

  test("defaults to current weather when range is omitted", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/?location=西安",
      headers: {
        accept: "text/markdown"
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.trim()).toBe("西安当前⛅ 局部多云，16.0°C，体感 16.0°C。湿度 42%，风速 8.0 km/h。");
  });

  test("supports wttr-like location shortcuts on the root path", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/%E8%A5%BF%E5%AE%89",
      headers: {
        accept: "text/markdown"
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.trim()).toBe("西安当前⛅ 局部多云，16.0°C，体感 16.0°C。湿度 42%，风速 8.0 km/h。");
  });

  test("returns three forecast rows for the 3d table profile", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/?location=西安&range=3d&profile=table",
      headers: {
        accept: "text/markdown"
      }
    });

    expect(response.body).toContain("# 西安 3 日天气预报");
    expect(response.body).toContain("| 2026-04-20 | 🌧 雨 |");
    expect(response.body).toContain("| 2026-04-22 | ⛅ 局部多云 |");
    expect(response.body).not.toContain("| 2026-04-23 |");
    expect(response.body).toContain("🌧");
  });

  test("returns a full multi-day forecast with summary and table", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/?location=西安&range=3d&profile=full",
      headers: {
        accept: "text/markdown"
      }
    });

    expect(response.body).toContain("# 西安 3 日天气预报");
    expect(response.body).toContain("西安接下来 3 天覆盖 2026-04-20 到 2026-04-22");
    expect(response.body).toContain("- 摘要");
    expect(response.body).toContain("最高降水概率：93%");
    expect(response.body).toContain("| 日期 | 天气 | 最低温 | 最高温 | 最高降水概率 | 最大风速 |");
  });

  test("returns a full current weather result with separate detail lines", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/?location=西安&profile=full",
      headers: {
        accept: "text/markdown"
      }
    });

    expect(response.body).toContain("# 西安当前天气");
    expect(response.body).toContain("- 详细信息");
    expect(response.body).toContain("湿度：42%");
    expect(response.body).toContain("风速：8.0 km/h");
  });

  test("exposes agent-native query inputs in the markdown action schema", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/",
      headers: {
        accept: "text/markdown"
      }
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain('"range"');
    expect(response.body).toContain('"today"');
    expect(response.body).toContain('"tomorrow"');
    expect(response.body).toContain('"profile"');
    expect(response.body).toContain('"brief"');
    expect(response.body).toContain('"units"');
    expect(response.body).not.toContain('"emoji"');
  });

  test("returns a clear failure when daily is missing an explicit date", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/?location=西安&range=daily",
      headers: {
        accept: "text/markdown"
      }
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("# 天气查询失败");
    expect(response.body).toContain("range=daily requires date=YYYY-MM-DD");
  });

  test("resolves today and tomorrow from the weather location timezone", async () => {
    const requestedDates: string[] = [];
    const captureProvider: WeatherProvider = {
      ...provider,
      async getDailyForecast(_location, options) {
        requestedDates.push(options.date);
        return provider.getDailyForecast(_location, options);
      }
    };

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T17:30:00.000Z"));

    await createWeatherArtifact({ location: "西安", range: "today", locale: "zh-CN" }, captureProvider);
    await createWeatherArtifact({ location: "西安", range: "tomorrow", locale: "zh-CN" }, captureProvider);

    expect(requestedDates).toEqual(["2026-04-21", "2026-04-22"]);
  });

  test("returns the weather start page as an app-entry markdown document", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/",
      headers: {
        accept: "text/markdown"
      }
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/markdown");
    expect(response.body).toContain("# Weather");
    expect(response.body).toContain("## Purpose");
    expect(response.body).toContain("## Context");
    expect(response.body).toContain("## Rules");
    expect(response.body).toContain("## Result");
    expect(response.body).toContain("## Views");
    expect(response.body).toContain("## Handoff");
    expect(response.body).toContain("/西安");
    expect(response.body).toContain("### Query Examples");
    expect(response.body).toContain("location=西安");
    expect(response.body).toContain("range=daily&date=2026-04-25");
    expect(response.body).toContain("### Optional Parameters");
    expect(response.body).toContain("profile=brief|table|full");
    expect(response.body).toContain("::: block{id=\"query\" actions=\"query_weather\" trust=\"trusted\"}");
    expect(response.body).toContain("```mdan");
    expect(response.body).toContain('"id": "query_weather"');
  });

  test("omits seven day forecast from the action schema when the provider does not support it", async () => {
    const server = createWeatherMarkdownServer({
      ...provider,
      source: {
        name: "WeatherAPI.com",
        url: "https://www.weatherapi.com/",
        geocodingName: "WeatherAPI.com"
      },
      capabilities: {
        maxForecastDays: 3
      }
    });

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/",
      headers: {
        accept: "text/markdown"
      }
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain('"3d"');
    expect(response.body).not.toContain('"7d"');
    expect(response.body).not.toContain("`7d`: 7 day forecast table");
  });

  test("projects query results to html for human browsers", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/?location=西安&range=7d",
      headers: {
        accept: "text/html"
      }
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("weather-surface");
    expect(response.body).toContain("weather-table-frame");
    expect(response.body).toContain("<table>");
    expect(response.body).toContain("<td>2026-04-20</td>");
    expect(response.body).not.toContain("HTML responses are only available");
    expect(response.body).not.toContain("```mdan");
    expect(response.body).not.toContain("allowed_next_actions");
  });

  test("defaults html root reads to a dedicated home forecast when city headers are available", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/",
      headers: {
        accept: "text/html",
        "cf-ipcity": "西安"
      }
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("weather-surface");
    expect(response.body).toContain("weather-table-frame");
    expect(response.body).toContain("西安今天");
    expect(response.body).toContain("<table>");
    expect(response.body).toContain("2026-04-22");
    expect(response.body).not.toContain("西安 3 日天气预报");
    expect(response.body).not.toContain("Enter one place. Get the weather back.");
    expect(response.body).not.toContain("/西安");
    expect(response.body).not.toContain("```mdan");
    expect(response.body).not.toContain("allowed_next_actions");
  });

  test("uses accept-language for edge geo html root reads when locale is omitted", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/",
      headers: {
        accept: "text/html",
        "accept-language": "en-US,en;q=0.9",
        "cf-ipcity": "London"
      }
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("Today in London");
    expect(response.body).not.toContain("London 3-day forecast");
    expect(response.body).not.toContain("伦敦");
  });

  test("returns a geolocation bootstrap page for html root reads without any geo hint", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/",
      headers: {
        accept: "text/html"
      }
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("正在定位当前天气");
    expect(response.body).toContain("navigator.geolocation.getCurrentPosition");
    expect(response.body).not.toContain("西安当前");
  });

  test("uses accept-language for the geolocation bootstrap page when locale is omitted", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/",
      headers: {
        accept: "text/html",
        "accept-language": "en-US,en;q=0.9"
      }
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("Locating current weather");
    expect(response.body).toContain("Allow browser location access");
    expect(response.body).not.toContain("正在定位当前天气");
  });

  test("uses configured IP location resolver before falling back to browser geolocation", async () => {
    const server = createWeatherMarkdownServer(provider, {
      rootLocation: {
        resolveIpLocation({ ip, locale }) {
          expect(ip).toBe("203.0.113.7");
          expect(locale).toBe("en-US");
          return "London";
        }
      }
    });

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/",
      headers: {
        accept: "text/html",
        "accept-language": "en-US,en;q=0.9",
        "x-forwarded-for": "203.0.113.7"
      }
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("Today in London");
    expect(response.body).not.toContain("London 3-day forecast");
    expect(response.body).not.toContain("Locating current weather");
  });

  test("uses the default country.is IP resolver when no custom resolver is configured", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      async json() {
        return { city: "London" };
      }
    } as Response);

    const server = createWeatherMarkdownServer(provider);
    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/",
      headers: {
        accept: "text/html",
        "accept-language": "en-US,en;q=0.9",
        "x-forwarded-for": "203.0.113.7"
      }
    });

    const requestUrl = fetchMock.mock.calls[0]?.[0] as URL;
    expect(requestUrl.origin).toBe("https://api.country.is");
    expect(requestUrl.pathname).toBe("/203.0.113.7");
    expect(requestUrl.searchParams.get("fields")).toBe("city,subdivision,location,country");
    expect(response.status).toBe(200);
    expect(response.body).toContain("Today in London");
    expect(response.body).not.toContain("London 3-day forecast");
    expect(response.body).not.toContain("Locating current weather");
  });

  test("falls back to coordinates when the default IP resolver has no city", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      async json() {
        return {
          city: null,
          country: "United States",
          location: {
            latitude: 37.751,
            longitude: -97.822
          }
        };
      }
    } as Response);

    const server = createWeatherMarkdownServer(provider);
    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/",
      headers: {
        accept: "text/html",
        "accept-language": "en-US,en;q=0.9",
        "x-forwarded-for": "8.8.8.8"
      }
    });

    const requestUrl = fetchMock.mock.calls[0]?.[0] as URL;
    expect(requestUrl.origin).toBe("https://api.country.is");
    expect(requestUrl.pathname).toBe("/8.8.8.8");
    expect(requestUrl.searchParams.get("fields")).toBe("city,subdivision,location,country");
    expect(response.status).toBe(200);
    expect(response.body).toContain("Today in United States");
    expect(response.body).not.toContain("United States 3-day forecast");
    expect(response.body).not.toContain("Locating current weather");
  });

  test("accepts percent-encoded edge city headers", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/",
      headers: {
        accept: "text/html",
        "cf-ipcity": "%E8%A5%BF%E5%AE%89"
      }
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("西安今天");
    expect(response.body).not.toContain("西安 3 日天气预报");
    expect(response.body).not.toContain("Location not found");
  });

  test("prefers explicit dev city headers over IP lookup", async () => {
    const server = createWeatherMarkdownServer(provider, {
      rootLocation: {
        resolveIpLocation() {
          return "London";
        }
      }
    });

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/",
      headers: {
        accept: "text/html",
        "x-dev-city": "西安",
        "x-forwarded-for": "203.0.113.7"
      }
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("西安今天");
    expect(response.body).not.toContain("西安 3 日天气预报");
    expect(response.body).not.toContain("London 3-day forecast");
  });

  test("accepts browser geolocation coordinates on the root path", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/?latitude=34.3416&longitude=108.9398&timezone=Asia%2FShanghai",
      headers: {
        accept: "text/html"
      }
    });

    expect(response.status).toBe(200);
    expect(response.body).toContain("这里今天");
    expect(response.body).not.toContain("这里 3 日天气预报");
    expect(response.body).toContain("局部多云");
  });
});
