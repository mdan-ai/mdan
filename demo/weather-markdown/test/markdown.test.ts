import { describe, expect, test } from "vitest";

import { compileForecastMarkdown, type DailyForecastRow } from "../src/markdown.ts";

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

数据和位置服务：[Open-Meteo](https://open-meteo.com/)，由 [MDAN Weather](https://docs.mdan.ai) 编辑/整理于 2026-04-20 09:30 Asia/Shanghai。`);
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
    ).toBe(`# 西安明天天气

西安明天：🌧 雨，10.7-16.9°C，最高降水概率 93%，最大风速 4.8 m/s。

数据和位置服务：[Open-Meteo](https://open-meteo.com/)，由 [MDAN Weather](https://docs.mdan.ai) 编辑/整理于 2026-04-20 09:30 Asia/Shanghai。`);
  });
});
