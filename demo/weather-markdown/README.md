# MDAN Weather

This demo turns public weather API data into user-ready Markdown artifacts for
agents.

`wttr.in` made weather terminal-native. This demo explores the MDAN version of
that idea: weather results that agents can hand to users directly, while humans
can open the same URL as a normal web page.

## Goal

Flag:

> MDAN Weather should be more suitable than `wttr.in` as a default weather
> interface for agents.

The demo is not trying to beat `wttr.in` for terminal users. It is trying to
produce Markdown artifacts that work naturally in chat, docs, web pages, and
agent responses.

## Core Rule

Markdown is the data payload.

Action JSON is embedded in the Markdown payload inside a `mdan` fenced block.
Weather facts are not duplicated into outer JSON response fields.

## Run

From the repository root:

```sh
node scripts/run-example-dev.mjs demo/weather-markdown/dev.ts
```

Open:

```text
http://127.0.0.1:4327/weather
```

## Agent-First Interface

The primary contract is `range + profile + Accept`.

Useful ranges:

- `current`: current weather
- `today`: today
- `tomorrow`: tomorrow
- `daily`: one explicit date, using `date=YYYY-MM-DD`
- `3d`: three day forecast
- `7d`: seven day forecast

Useful profiles:

- `brief`: one short user-ready paragraph
- `table`: Markdown table with provenance
- `full`: reserved for richer artifacts; currently renders the table artifact

Optional rendering parameters:

- `units=metric|us`
- `wind=kmh|ms|mph`
- `locale=zh-CN|en`
- `emoji=true|false`

Ask for a 7 day forecast as Markdown:

```sh
curl -H 'Accept: text/markdown' \
  'http://127.0.0.1:4327/weather/query?location=西安&range=7d&profile=table'
```

The response is a Markdown artifact:

```md
# 西安 7 日天气预报

| 日期 | 天气 | 最低温 | 最高温 | 最高降水概率 | 最大风速 |
|---|---|---:|---:|---:|---:|
| 2026-04-20 | 🌧 雨 | 10.7°C | 16.9°C | 93% | 17.3 km/h |

数据和位置服务：[Open-Meteo](https://open-meteo.com/)，由 [MDAN Weather](https://docs.mdan.ai) 编辑/整理于 2026-04-20 09:30 Asia/Shanghai。

```mdan
{
  "app_id": "weather-markdown-demo",
  "state_id": "weather:E8A5BFE5AE89:7d",
  "state_version": 1,
  "blocks": [],
  "actions": [],
  "allowed_next_actions": []
}
```
```

Ask for a brief tomorrow result:

```sh
curl -H 'Accept: text/markdown' \
  'http://127.0.0.1:4327/weather/query?location=西安&range=tomorrow&profile=brief&wind=ms'
```

The response is ready to paste into an agent answer:

```md
# 西安明天天气

西安明天：🌧 雨，10.7-16.9°C，最高降水概率 93%，最大风速 4.8 m/s。

数据和位置服务：[Open-Meteo](https://open-meteo.com/)，由 [MDAN Weather](https://docs.mdan.ai) 编辑/整理于 2026-04-20 09:30 Asia/Shanghai。
```

If an agent or runtime needs the structured action contract directly, the SDK can
still expose the internal JSON surface:

```sh
curl -H 'Accept: application/json' \
  'http://127.0.0.1:4327/weather'
```

## wttr Alignment

This service aligns with `wttr.in` on capabilities, not syntax.

| wttr capability | MDAN Weather P0 |
|---|---|
| Current weather | `range=current` |
| Today/tomorrow forecast | `range=today` / `range=tomorrow` |
| Multi-day forecast | `range=3d` / `range=7d` |
| Compact output | `profile=brief` |
| Human-readable report | `Accept: text/markdown` or browser HTML |
| JSON for automation | MDAN JSON actions only; weather facts stay in Markdown |
| Units | `units=metric|us`, `wind=kmh|ms|mph` |
| Emoji/glyphs | `emoji=true|false` |
| Data provenance | Markdown provenance footer |

## Non-Goals

- no server-side LLM
- no natural-language intent parsing
- no clothing, travel, activity, umbrella, calendar, or reminder advice
- no weather facts in JSON response fields
- no wttr-compatible terminal grammar as the primary interface

The caller agent maps user language to the action input. This service returns
deliverable Markdown only.

## Data Source

Weather data comes from Open-Meteo. This demo is about representation quality,
not forecast accuracy.
