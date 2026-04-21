import { describe, expect, test } from "vitest";

import { createWeatherMarkdownServer } from "../app.ts";
import type { WeatherProvider } from "../src/open-meteo.ts";

const provider: WeatherProvider = {
  async resolveLocation() {
    return {
      name: "西安",
      latitude: 34.3416,
      longitude: 108.9398,
      timezone: "Asia/Shanghai"
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
  async getSevenDayForecast() {
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
  test("returns a directly deliverable markdown artifact", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/weather/query?location=西安&range=7d",
      headers: {
        accept: "text/markdown"
      }
    });

    expect(response.headers["content-type"]).toContain("text/markdown");
    expect(response.body).toContain("# 西安 7 日天气预报");
    expect(response.body).toContain("| 2026-04-20 | 🌧 雨 | 10.7°C | 16.9°C | 93% | 17.3 km/h |");
    expect(response.body).toContain(
      "数据和位置服务：[Open-Meteo](https://open-meteo.com/)，由 [MDAN Weather](https://docs.mdan.ai) 编辑/整理于"
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
      url: "http://127.0.0.1/weather/query?location=西安&range=tomorrow&profile=brief&wind=ms",
      headers: {
        accept: "text/markdown"
      }
    });

    expect(response.headers["content-type"]).toContain("text/markdown");
    expect(response.body).toContain("# 西安明天天气");
    expect(response.body).toContain("西安明天：🌧 雨，10.7-16.9°C，最高降水概率 93%，最大风速 4.8 m/s。");
    expect(response.body).toContain(
      "数据和位置服务：[Open-Meteo](https://open-meteo.com/)，由 [MDAN Weather](https://docs.mdan.ai) 编辑/整理于"
    );
    expect(response.body).not.toContain("## 来源与生成");
    expect(response.body).toContain("```mdan");
  });

  test("returns current weather with the same provenance footer", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/weather/query?location=西安&range=current&profile=brief",
      headers: {
        accept: "text/markdown"
      }
    });

    expect(response.body).toContain("# 西安当前天气");
    expect(response.body).toContain("西安当前⛅ 局部多云");
    expect(response.body).toContain(
      "数据和位置服务：[Open-Meteo](https://open-meteo.com/)，由 [MDAN Weather](https://docs.mdan.ai) 编辑/整理于"
    );
    expect(response.body).not.toContain("## 来源与生成");
    expect(response.body).toContain("```mdan");
  });

  test("returns three forecast rows for the 3d table profile", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/weather/query?location=西安&range=3d&profile=table&emoji=false",
      headers: {
        accept: "text/markdown"
      }
    });

    expect(response.body).toContain("# 西安 3 日天气预报");
    expect(response.body).toContain("| 2026-04-20 | 雨 |");
    expect(response.body).toContain("| 2026-04-22 | 局部多云 |");
    expect(response.body).not.toContain("2026-04-23");
    expect(response.body).not.toContain("🌧");
  });

  test("exposes agent-native query inputs in the markdown action schema", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/weather",
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
    expect(response.body).toContain('"emoji"');
  });

  test("returns the weather start page as an app-entry markdown document", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/weather",
      headers: {
        accept: "text/markdown"
      }
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/markdown");
    expect(response.body).toContain("# MDAN Weather");
    expect(response.body).toContain("## Purpose");
    expect(response.body).toContain("## Context");
    expect(response.body).toContain("## Rules");
    expect(response.body).toContain("## Result");
    expect(response.body).toContain("## Views");
    expect(response.body).toContain("## Handoff");
    expect(response.body).toContain("::: block{id=\"query\" actions=\"query_weather\" trust=\"trusted\"}");
    expect(response.body).toContain("```mdan");
    expect(response.body).toContain('"id": "query_weather"');
  });

  test("projects query results to html for human browsers", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/weather/query?location=西安&range=7d",
      headers: {
        accept: "text/html"
      }
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("<table>");
    expect(response.body).toContain("<td>2026-04-20</td>");
    expect(response.body).not.toContain("HTML responses are only available");
    expect(response.body).not.toContain("```mdan");
    expect(response.body).not.toContain("allowed_next_actions");
  });

  test("projects the weather start page to html for browsers", async () => {
    const server = createWeatherMarkdownServer(provider);

    const response = await server.handle({
      method: "GET",
      url: "http://127.0.0.1/weather",
      headers: {
        accept: "text/html"
      }
    });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("MDAN Weather");
    expect(response.body).toContain("Purpose");
    expect(response.body).toContain("Context");
    expect(response.body).toContain("Rules");
    expect(response.body).toContain("Result");
    expect(response.body).not.toContain("```mdan");
    expect(response.body).not.toContain("allowed_next_actions");
  });
});
