import { actions, createApp } from "../../src/index.js";

import { createWeatherArtifact, type WeatherRange } from "./src/artifacts.js";
import { weatherMarkdownRenderer } from "./src/html-renderer.js";
import { createOpenMeteoProvider, type WeatherProvider } from "./src/open-meteo.js";

const queryInput = {
  location: {
    required: true,
    schema: {
      type: "string",
      description: "城市或地点，例如 西安、Tokyo、London"
    }
  },
  range: {
    required: true,
    schema: {
      type: "string",
      enum: ["current", "today", "tomorrow", "daily", "3d", "7d"],
      description: "查询范围：current、today、tomorrow、daily、3d、7d"
    }
  },
  profile: {
    schema: {
      type: "string",
      enum: ["brief", "table", "full"],
      default: "table",
      description: "返回粒度：brief 为一句话，table 为 Markdown 表格，full 为完整天气结果"
    }
  },
  units: {
    schema: {
      type: "string",
      enum: ["metric", "us"],
      default: "metric",
      description: "温度单位：metric 使用 °C，us 使用 °F"
    }
  },
  wind: {
    schema: {
      type: "string",
      enum: ["kmh", "ms", "mph"],
      default: "kmh",
      description: "风速单位：kmh、ms、mph"
    }
  },
  emoji: {
    schema: {
      type: "boolean",
      default: true,
      description: "是否在天气描述前加入 emoji 符号"
    }
  },
  date: {
    schema: {
      type: "string",
      description: "daily/today/tomorrow 的基准 ISO 日期，例如 2026-04-20"
    }
  },
  locale: {
    schema: {
      type: "string",
      default: "zh-CN"
    }
  }
} as const;

function toRange(value: unknown): WeatherRange {
  return value === "current" ||
    value === "daily" ||
    value === "today" ||
    value === "tomorrow" ||
    value === "3d" ||
    value === "7d"
    ? value
    : "7d";
}

function createWeatherResultSurface(markdown: string, stateId: string) {
  return {
    markdown,
    route: "/weather/query",
    actions: {
      app_id: "weather",
      state_id: stateId,
      state_version: 1,
      blocks: [],
      actions: [],
      allowed_next_actions: []
    }
  };
}

function createWeatherErrorSurface(message: string) {
  return createWeatherResultSurface(`# 天气查询失败

${message}`, "weather:error");
}

async function querySurface(url: string, provider: WeatherProvider) {
  const params = new URL(url).searchParams;
  const location = params.get("location")?.trim() || "西安";

  try {
    const result = await createWeatherArtifact(
      {
        location,
        range: toRange(params.get("range")),
        ...(params.get("profile") ? { profile: params.get("profile") as "brief" | "table" | "full" } : {}),
        ...(params.get("units") ? { units: params.get("units") as "metric" | "us" } : {}),
        ...(params.get("wind") ? { windUnit: params.get("wind") as "kmh" | "ms" | "mph" } : {}),
        ...(params.get("emoji") ? { emoji: params.get("emoji") !== "false" } : {}),
        ...(params.get("date") ? { date: params.get("date") ?? undefined } : {}),
        ...(params.get("locale") ? { locale: params.get("locale") ?? undefined } : {})
      },
      provider
    );

    return createWeatherResultSurface(result.content, result.stateId);
  } catch (error) {
    return createWeatherErrorSurface(error instanceof Error ? error.message : String(error));
  }
}

export function createWeatherMarkdownServer(provider: WeatherProvider = createOpenMeteoProvider()) {
  const app = createApp({
    appId: "weather",
    actionProof: {
      disabled: true
    },
    browserShell: {
      title: "MDAN Weather Markdown",
      moduleMode: "local-dist"
    },
    rendering: {
      markdown: weatherMarkdownRenderer
    }
  });

  const home = app.page("/weather", {
    markdown: `# MDAN Weather

## Purpose
Provide agent-ready weather reports that can be delivered directly to users.

## Context
Use this app when a user asks for current weather or a forecast for a specific
location and time range.

This page is the canonical MDAN weather app entry for online use. The same
surface can later be packaged into local skill flows, but this app treats the
online surface as the primary product.

## Rules
Always provide an explicit location.
Use only declared inputs and declared actions.
Do not invent weather facts.
If the request cannot be satisfied, return a failure result instead of guessing.

## Result
Returns a Markdown-first weather result suitable for direct user delivery.

Typical result modes include:

- brief answer
- Markdown table
- fuller forecast surface

::: block{id="query" actions="query_weather" trust="trusted"}
:::

## Views
Online use is the primary mode.
Browser clients may render this page as an interactive weather entry.
Agent clients may read the same page and invoke its declared action directly.

## Handoff
After presenting the weather result, the caller may continue with adjacent
planning tools such as travel, scheduling, or finance tools, but those tasks
are outside this app's scope.`,
    actions: [
      actions.read("query_weather", {
        label: "生成天气 Markdown",
        target: "/weather/query",
        input: queryInput
      })
    ],
    render() {
      return {
        query: `输入地点和范围，生成 agent 可以直接交付给用户的 Markdown 天气结果。

- current：当前天气短文本
- today：今天天气
- tomorrow：明天天气
- 3d：3 日天气 Markdown 表格
- 7d：7 日天气 Markdown 表格

可选 profile：brief、table、full。`
      };
    }
  });

  app.route(home);

  app.route("/weather/query", async ({ request }) => querySurface(request.url, provider));

  return app;
}
