import { describe, expect, test } from "vitest";

import { compileCurrentWeatherMarkdown, compileForecastMarkdown, compileHomeForecastMarkdown, type DailyForecastRow } from "../src/markdown.ts";

describe("weather markdown artifact compiler", () => {
  test("renders a seven day forecast as user-ready markdown", () => {
    const rows: DailyForecastRow[] = [
      {
        date: "2026-04-20",
        condition: "雨",
        conditionCode: 63,
        tempMinC: 10.7,
        tempMaxC: 16.9,
        precipitationProbabilityMax: 93,
        windSpeedMaxKmh: 17.3
      },
      {
        date: "2026-04-21",
        condition: "晴",
        conditionCode: 0,
        tempMinC: 12,
        tempMaxC: 23.1,
        precipitationProbabilityMax: 3,
        windSpeedMaxKmh: 12.5
      }
    ];

    expect(
      compileForecastMarkdown({
        location: "西安",
        title: "西安 7 日天气预报",
        rows,
        source: "Open-Meteo",
        sourceUrl: "https://open-meteo.com/",
        geocodingSource: "Open-Meteo Geocoding",
        service: "MDAN Weather",
        serviceUrl: "https://docs.mdan.ai",
        generatedAt: "2026-04-20 09:30 Asia/Shanghai",
        locale: "zh-CN",
        units: "metric",
        windUnit: "kmh",
        profile: "table",
        emoji: true
      })
    ).toBe(`# 西安 7 日天气预报

| 日期 | 天气 | 最低温 | 最高温 | 最高降水概率 | 最大风速 |
|---|---|---:|---:|---:|---:|
| 2026-04-20 | 🌧 雨 | 10.7°C | 16.9°C | 93% | 17.3 km/h |
| 2026-04-21 | ☀️ 晴 | 12.0°C | 23.1°C | 3% | 12.5 km/h |

来源：[Open-Meteo](https://open-meteo.com/)`);
  });

  test("renders a brief one day forecast for direct agent delivery", () => {
    expect(
      compileForecastMarkdown({
        location: "西安",
        title: "西安明天天气",
        rows: [
          {
            date: "2026-04-21",
            condition: "雨",
            conditionCode: 63,
            tempMinC: 10.7,
            tempMaxC: 16.9,
            precipitationProbabilityMax: 93,
            windSpeedMaxKmh: 17.3
          }
        ],
        source: "Open-Meteo",
        sourceUrl: "https://open-meteo.com/",
        geocodingSource: "Open-Meteo Geocoding",
        service: "MDAN Weather",
        serviceUrl: "https://docs.mdan.ai",
        generatedAt: "2026-04-20 09:30 Asia/Shanghai",
        locale: "zh-CN",
        units: "metric",
        windUnit: "ms",
        profile: "brief",
        emoji: true
      })
    ).toBe(`西安明天：🌧 雨，10.7-16.9°C，最高降水概率 93%，最大风速 4.8 m/s。`);
  });

  test("renders a full one day forecast with explicit detail lines", () => {
    expect(
      compileForecastMarkdown({
        location: "西安",
        title: "西安明天天气",
        rows: [
          {
            date: "2026-04-21",
            condition: "雨",
            conditionCode: 63,
            tempMinC: 10.7,
            tempMaxC: 16.9,
            precipitationProbabilityMax: 93,
            windSpeedMaxKmh: 17.3
          }
        ],
        source: "Open-Meteo",
        sourceUrl: "https://open-meteo.com/",
        geocodingSource: "Open-Meteo Geocoding",
        service: "MDAN Weather",
        serviceUrl: "https://docs.mdan.ai",
        generatedAt: "2026-04-20 09:30 Asia/Shanghai",
        locale: "zh-CN",
        units: "metric",
        windUnit: "kmh",
        profile: "full",
        emoji: true
      })
    ).toBe(`# 西安明天天气

西安明天：🌧 雨，10.7-16.9°C。

- 详细信息
  - 最低温：10.7°C
  - 最高温：16.9°C
  - 最高降水概率：93%
  - 最大风速：17.3 km/h

来源：[Open-Meteo](https://open-meteo.com/)`);
  });

  test("renders english current weather copy when locale is english", () => {
    expect(
      compileCurrentWeatherMarkdown({
        location: "London",
        condition: "Partly cloudy",
        conditionCode: 2,
        temperatureC: 16,
        apparentTemperatureC: 14.5,
        humidityPercent: 54,
        windSpeedKmh: 12,
        source: "Open-Meteo",
        sourceUrl: "https://open-meteo.com/",
        geocodingSource: "Open-Meteo Geocoding",
        service: "MDAN Weather",
        serviceUrl: "https://docs.mdan.ai",
        generatedAt: "2026-04-20 09:30 Europe/London",
        locale: "en",
        profile: "brief",
        units: "metric",
        windUnit: "kmh",
        emoji: true
      })
    ).toBe(`Current weather in London: ⛅ Partly cloudy, 16.0°C, feels like 14.5°C. Humidity 54%, wind 12.0 km/h.`);
  });

  test("renders a dedicated home forecast with today's summary followed by a table", () => {
    expect(
      compileHomeForecastMarkdown({
        location: "西安",
        rows: [
          {
            date: "2026-04-20",
            condition: "雨",
            conditionCode: 63,
            tempMinC: 10.7,
            tempMaxC: 16.9,
            precipitationProbabilityMax: 93,
            windSpeedMaxKmh: 17.3
          },
          {
            date: "2026-04-21",
            condition: "晴",
            conditionCode: 0,
            tempMinC: 12,
            tempMaxC: 23.1,
            precipitationProbabilityMax: 3,
            windSpeedMaxKmh: 12.5
          },
          {
            date: "2026-04-22",
            condition: "局部多云",
            conditionCode: 2,
            tempMinC: 13.4,
            tempMaxC: 25.2,
            precipitationProbabilityMax: 10,
            windSpeedMaxKmh: 8.4
          }
        ],
        source: "Open-Meteo",
        sourceUrl: "https://open-meteo.com/",
        service: "MDAN Weather",
        serviceUrl: "https://docs.mdan.ai",
        generatedAt: "2026-04-20 09:30 Asia/Shanghai",
        locale: "zh-CN",
        units: "metric",
        windUnit: "kmh",
        emoji: true
      })
    ).toBe(`西安今天：🌧 雨，10.7-16.9°C，最高降水概率 93%，最大风速 17.3 km/h。

| 日期 | 天气 | 最低温 | 最高温 | 最高降水概率 | 最大风速 |
|---|---|---:|---:|---:|---:|
| 2026-04-20 | 🌧 雨 | 10.7°C | 16.9°C | 93% | 17.3 km/h |
| 2026-04-21 | ☀️ 晴 | 12.0°C | 23.1°C | 3% | 12.5 km/h |
| 2026-04-22 | ⛅ 局部多云 | 13.4°C | 25.2°C | 10% | 8.4 km/h |

来源：[Open-Meteo](https://open-meteo.com/)`);
  });
});
