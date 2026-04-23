# MDAN Weather

This demo turns public weather API data into a very direct online weather skill.
One location goes in. One user-ready Markdown weather result comes out.

`wttr.in` made weather terminal-native. This demo explores the MDAN online
skills version of that idea: weather results that agents can hand to users
directly, while humans can open the same URL as a normal web page.

The root route `/` is the canonical MDAN app entry for the service. It uses
the shared semantic-slot structure:

- `Purpose`
- `Context`
- `Rules`
- `Result`
- `Views`
- `Handoff`

## Goal

Strategic goal:

> MDAN Weather should be more suitable than `wttr.in` as a default online
> weather skill for agents.

The demo is not trying to beat `wttr.in` for terminal users. It is trying to
produce Markdown surfaces that work naturally in chat, docs, web pages, and
agent responses.

## Core Rule

Markdown is the primary read surface.

Action JSON is embedded in the Markdown surface inside a `mdan` fenced block.
Weather facts are not duplicated into outer JSON response fields.

## Run

From the repository root:

```sh
node scripts/run-example-dev.mjs demo/weather-markdown/dev.ts
```

Open:

```text
http://127.0.0.1:4327/
```

## Agent-First Interface

The primary contract is `location + optional range + Accept`.

The root path serves both roles:

- `/` with no inputs returns the app entry
- `/?location=西安` returns weather directly
- `/西安` is the wttr-like shortcut for the same current-weather query

The shortest query only needs `location`. If `range` is omitted, the service
returns the current weather.

Useful ranges:

- `current`: current weather
- `today`: today
- `tomorrow`: tomorrow
- `daily`: one explicit date, using `date=YYYY-MM-DD`
- `3d`: three day forecast
- `7d`: seven day forecast when the selected provider supports it

Useful profiles:

- `brief`: one direct wttr-like line
- `table`: Markdown table with provenance
- `full`: short summary plus explicit detail lines; multi-day responses also keep the table

Default profile behavior:

- `current`, `today`, `tomorrow`: `brief`
- `3d`, `7d`: `table`

Provider forecast limits:

- Open-Meteo supports `3d` and `7d`.
- WeatherAPI.com free keys support `3d`; `7d` requires a plan/provider that supports seven forecast days.

Optional rendering parameters:

- `units=metric|us`
- `wind=kmh|ms|mph`
- `locale=zh-CN|en`

Ask for current weather as Markdown:

```sh
curl -H 'Accept: text/markdown' \
  'http://127.0.0.1:4327/?location=西安'
```

The brief response is a single Markdown-compatible line:

```md
西安当前☁️ 阴，15.8°C，体感 14.5°C。湿度 57%，风速 3.4 km/h。
```

Ask for a 3 day forecast as Markdown:

```sh
curl -H 'Accept: text/markdown' \
  'http://127.0.0.1:4327/?location=西安&range=3d&profile=table'
```

The response is a Markdown surface:

```md
# 西安 3 日天气预报

| 日期 | 天气 | 最低温 | 最高温 | 最高降水概率 | 最大风速 |
|---|---|---:|---:|---:|---:|
| 2026-04-20 | 🌧 雨 | 10.7°C | 16.9°C | 93% | 17.3 km/h |

来源：[Open-Meteo](https://open-meteo.com/)

```mdan
{
  "app_id": "weather",
  "state_id": "weather:E8A5BFE5AE89:3d",
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
  'http://127.0.0.1:4327/?location=西安&range=tomorrow&profile=brief&wind=ms'
```

The response is ready to paste into an agent answer:

```md
西安明天：🌧 雨，10.7-16.9°C，最高降水概率 93%，最大风速 4.8 m/s。
```

If an agent or runtime needs the structured action contract directly, it reads
the `mdan` fenced block embedded in the Markdown app entry:

```sh
curl -H 'Accept: text/markdown' \
  'http://127.0.0.1:4327/'
```

## wttr Alignment

This service aligns with `wttr.in` on capabilities, not syntax.

| wttr capability | MDAN Weather P0 |
|---|---|
| Current weather | `range=current` |
| Today/tomorrow forecast | `range=today` / `range=tomorrow` |
| Multi-day forecast | `range=3d`, or `range=7d` when supported by the provider |
| Compact output | `profile=brief`, one line |
| Human-readable report | `Accept: text/markdown` or browser HTML |
| JSON for automation | MDAN JSON actions only; weather facts stay in Markdown |
| Units | `units=metric|us`, `wind=kmh|ms|mph` |
| Emoji/glyphs | Always on |
| Data provenance | Markdown provenance footer |

## App API Shape

This demo now uses the public app API rather than the lower-level server
runtime:

- `createApp(...)` for the app shell
- `app.page(...)` for the shared `/` entry page
- `app.route(...)` for `/` and `/:location`
- `actions.read(...)` for the weather query contract

The result is positioned as an online skills app, not just a protocol/runtime
demo.

## Non-Goals

- no server-side LLM
- no natural-language intent parsing
- no clothing, travel, activity, umbrella, calendar, or reminder advice
- no weather facts in JSON response fields
- no wttr-compatible terminal grammar as the primary interface

The caller agent maps user language to the action input. This service returns
deliverable Markdown surfaces only.

## Data Source

Weather data is accessed through a small provider layer.

Default behavior:

- Without credentials, the demo uses Open-Meteo.
- If `WEATHERAPI_KEY` or `WEATHER_API_KEY` is present, the demo uses WeatherAPI.com.
- Set `WEATHER_PROVIDER=open-meteo` or `WEATHER_PROVIDER=weatherapi` to force a provider.

Example:

```sh
WEATHER_PROVIDER=weatherapi WEATHERAPI_KEY=... \
  node scripts/run-example-dev.mjs demo/weather-markdown/dev.ts
```

This demo is about representation quality, not forecast accuracy. Provider
comparisons should focus on location resolution, forecast freshness, language
quality, quota limits, and attribution requirements.

### WeatherAPI.com Response Fields

WeatherAPI.com field pruning is configured in the WeatherAPI account dashboard
under API response fields. This demo only reads the following fields, so the
WeatherAPI.com key can be trimmed to this subset:

Location object:

- `name`
- `lat`
- `lon`
- `tz_id`

Current object:

- `temp_c`
- `feelslike_c`
- `humidity`
- `wind_kph`
- `condition.text`
- `condition.code`

Forecast day object:

- `forecastday.date`
- `day.maxtemp_c`
- `day.mintemp_c`
- `day.maxwind_kph`
- `day.daily_chance_of_rain`
- `day.condition.text`
- `day.condition.code`
