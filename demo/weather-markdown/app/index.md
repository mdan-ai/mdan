# Weather

Enter one place. Get the weather back.

默认直接返回当前天气。

快捷打开：

- `/西安`
- `location=西安&range=today`
- `location=西安&range=3d`
- `/London?locale=en`

::: block{id="query" actions="query_weather" trust="trusted"}

<!-- agent:begin id="weather_contract" -->
## Purpose
Return direct weather results for one place.

## Context
Use this app for current weather or a short forecast.
One place in, one result out.

## Rules
- Always provide a location.
- If `range=daily`, also provide `date=YYYY-MM-DD`.
- Use declared inputs only.
- Do not invent weather facts.
- If the query cannot be resolved, return a clear failure result.

## Result
- `current`: one short current-weather result
- `today`: today's weather
- `tomorrow`: tomorrow's weather
- `3d`: 3 day forecast table
- `7d`: 7 day forecast table
- `daily`: one explicit date, with `date=YYYY-MM-DD`

If `profile` is omitted, single-day queries prefer `brief` and multi-day
queries prefer `table`.

### Query Examples
- `location=西安`
- `/西安`
- `location=西安&range=today`
- `location=西安&range=3d`
- `location=London&range=daily&date=2026-04-25`

### Optional Parameters
- `profile=brief|table|full`
- `units=metric|us`
- `wind=kmh|ms|mph`
- `locale=zh-CN|en`

## Views
- Markdown is the primary surface.
- Browsers may render the same route as a normal web page.
- Agents may read this page and call the declared action directly.

## Handoff
This app ends at weather delivery.
<!-- agent:end -->
