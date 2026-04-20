import { createMdanServer } from "../../src/server/index.js";

import { createWeatherArtifact, type WeatherRange } from "./src/artifacts.js";
import { weatherMarkdownRenderer } from "./src/html-renderer.js";
import { createOpenMeteoProvider, type WeatherProvider } from "./src/open-meteo.js";

const queryInputSchema = {
  type: "object",
  required: ["location", "range"],
  properties: {
    location: {
      type: "string",
      description: "城市或地点，例如 西安、Tokyo、London"
    },
    range: {
      type: "string",
      enum: ["current", "today", "tomorrow", "daily", "3d", "7d"],
      description: "查询范围：current、today、tomorrow、daily、3d、7d"
    },
    profile: {
      type: "string",
      enum: ["brief", "table", "full"],
      default: "table",
      description: "返回粒度：brief 为一句话，table 为 Markdown 表格，full 为完整 artifact"
    },
    units: {
      type: "string",
      enum: ["metric", "us"],
      default: "metric",
      description: "温度单位：metric 使用 °C，us 使用 °F"
    },
    wind: {
      type: "string",
      enum: ["kmh", "ms", "mph"],
      default: "kmh",
      description: "风速单位：kmh、ms、mph"
    },
    emoji: {
      type: "boolean",
      default: true,
      description: "是否在天气描述前加入 emoji 符号"
    },
    date: {
      type: "string",
      description: "daily/today/tomorrow 的基准 ISO 日期，例如 2026-04-20"
    },
    locale: {
      type: "string",
      default: "zh-CN"
    }
  },
  additionalProperties: false
};

function queryAction(stateId: string, stateVersion: number) {
  return {
    app_id: "weather-markdown-demo",
    state_id: stateId,
    state_version: stateVersion,
    blocks: ["query"],
    actions: [
      {
        id: "query_weather",
        label: "生成天气 Markdown",
        verb: "read",
        target: "/weather/query",
        transport: {
          method: "GET"
        },
        input_schema: queryInputSchema,
        state_effect: {
          response_mode: "page"
        }
      }
    ],
    allowed_next_actions: ["query_weather"]
  };
}

function startEnvelope() {
  const stateId = "weather-markdown:start";
  const stateVersion = 1;
  const block = `输入地点和范围，生成 agent 可以直接交付给用户的 Markdown 天气结果。

- current：当前天气短文本
- today：今天天气
- tomorrow：明天天气
- 3d：3 日天气 Markdown 表格
- 7d：7 日天气 Markdown 表格

可选 profile：brief、table、full。`;

  return {
    content: `# MDAN Weather Markdown

把公开天气 API 转成 agent-ready、user-ready 的 Markdown artifact。

Markdown 是返回数据源头；JSON 只定义可执行动作。

::: block{id="query" actions="query_weather" trust="trusted"}
${block}
:::`,
    actions: queryAction(stateId, stateVersion),
    view: {
      route_path: "/weather",
      regions: {
        query: block
      }
    }
  };
}

function resultActions(stateId: string) {
  return {
    app_id: "weather-markdown-demo",
    state_id: stateId,
    state_version: 1,
    blocks: [],
    actions: [],
    allowed_next_actions: []
  };
}

function errorEnvelope(message: string) {
  return {
    content: `# 天气查询失败

${message}`,
    actions: resultActions("weather-markdown:error"),
    view: {
      route_path: "/weather/query"
    }
  };
}

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

async function queryEnvelope(url: string, provider: WeatherProvider) {
  const params = new URL(url).searchParams;
  const location = params.get("location")?.trim() || "西安";
  try {
    const artifact = await createWeatherArtifact(
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

    return {
      content: artifact.content,
      actions: resultActions(artifact.stateId),
      view: {
        route_path: "/weather/query"
      }
    };
  } catch (error) {
    return errorEnvelope(error instanceof Error ? error.message : String(error));
  }
}

export function createWeatherMarkdownServer(provider: WeatherProvider = createOpenMeteoProvider()) {
  const server = createMdanServer({
    actionProof: {
      disabled: true
    },
    browserShell: {
      title: "MDAN Weather Markdown",
      moduleMode: "local-dist",
      hydrate: false,
      markdownRenderer: weatherMarkdownRenderer
    }
  });

  server.page("/weather", async () => startEnvelope());

  server.page("/weather/query", async ({ request }) => queryEnvelope(request.url, provider));

  return server;
}
