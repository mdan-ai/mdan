import { createArtifactPage, createMdanServer, type MdanPage } from "../../src/server/index.js";

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
    app_id: "weather",
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

function startPage(): MdanPage {
  const stateId = "weather-markdown:start";
  const stateVersion = 1;
  const block = `输入地点和范围，生成 agent 可以直接交付给用户的 Markdown 天气结果。

- current：当前天气短文本
- today：今天天气
- tomorrow：明天天气
- 3d：3 日天气 Markdown 表格
- 7d：7 日天气 Markdown 表格

可选 profile：brief、table、full。`;

  return createArtifactPage({
    frontmatter: {
      app_id: "weather",
      state_id: stateId,
      state_version: stateVersion,
      response_mode: "page",
      route: "/weather"
    },
    markdown: `# MDAN Weather

## Purpose
Provide agent-ready weather reports that can be delivered directly to users.

## Context
Use this app when a user asks for current weather or a forecast for a specific
location and time range.

This page is the canonical MDAN app entry for weather. The same capability may
be projected into a local \`skill.md\` for compatibility with existing local
skill workflows.

## Rules
Always provide an explicit location.
Use only declared inputs and declared actions.
Do not invent weather facts.
If the request cannot be satisfied, return a failure result instead of guessing.

## Result
Returns a Markdown-first weather result suitable for direct user delivery.

Typical result modes include:

- brief answer
- table artifact
- fuller forecast artifact

::: block{id="query" actions="query_weather" trust="trusted"}
${block}
:::

<!-- mdan:block query -->

## Views
Online use is the primary mode.
Browser clients may render this page as an interactive weather entry.
Agent clients may read the same page and invoke its declared action directly.

## Handoff
After presenting the weather result, the caller may continue with adjacent
planning tools such as travel, scheduling, or finance tools, but those tasks
are outside this app's scope.`,
    executableJson: queryAction(stateId, stateVersion),
    blockContent: {
      query: block
    }
  });
}

function resultActions(stateId: string) {
  return {
    app_id: "weather",
    state_id: stateId,
    state_version: 1,
    blocks: [],
    actions: [],
    allowed_next_actions: []
  };
}

function errorPage(message: string): MdanPage {
  const stateId = "weather:error";
  return createArtifactPage({
    frontmatter: {
      app_id: "weather",
      state_id: stateId,
      state_version: 1,
      response_mode: "page",
      route: "/weather/query"
    },
    markdown: `# 天气查询失败

${message}`,
    executableJson: resultActions(stateId)
  });
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

    return createArtifactPage({
      frontmatter: {
        app_id: "weather",
        state_id: artifact.stateId,
        state_version: 1,
        response_mode: "page",
        route: "/weather/query"
      },
      markdown: artifact.content,
      executableJson: resultActions(artifact.stateId)
    });
  } catch (error) {
    return errorPage(error instanceof Error ? error.message : String(error));
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

  server.page("/weather", async () => startPage());

  server.page("/weather/query", async ({ request }) => queryEnvelope(request.url, provider));

  return server;
}
