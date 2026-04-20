export interface DailyForecastRow {
  date: string;
  condition: string;
  conditionCode?: number;
  tempMinC: number;
  tempMaxC: number;
  precipitationProbabilityMax: number;
  windSpeedMaxKmh: number;
}

export type WeatherProfile = "brief" | "table" | "full";
export type WeatherUnits = "metric" | "us";
export type WindUnit = "kmh" | "ms" | "mph";

export interface SevenDayForecastMarkdownInput {
  location: string;
  rows: DailyForecastRow[];
  source: string;
}

export interface ForecastMarkdownInput {
  location: string;
  title: string;
  rows: DailyForecastRow[];
  source: string;
  sourceUrl?: string;
  geocodingSource: string;
  service: string;
  serviceUrl?: string;
  generatedAt: string;
  locale: string;
  units: WeatherUnits;
  windUnit: WindUnit;
  profile: WeatherProfile;
  emoji: boolean;
}

export interface CurrentWeatherMarkdownInput {
  location: string;
  condition: string;
  conditionCode?: number;
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPercent: number;
  windSpeedKmh: number;
  source: string;
  sourceUrl?: string;
  geocodingSource?: string;
  service?: string;
  serviceUrl?: string;
  generatedAt?: string;
  units?: WeatherUnits;
  windUnit?: WindUnit;
  emoji?: boolean;
}

export interface DailyForecastMarkdownInput {
  location: string;
  date: string;
  row: DailyForecastRow;
  source: string;
}

function formatDecimal(value: number): string {
  return value.toFixed(1);
}

function conditionEmoji(row: DailyForecastRow): string {
  const code = row.conditionCode;
  if (code === 0) return "☀️";
  if (code === 1 || code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫";
  if (code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86) return "🌨";
  if (code === 95 || code === 96 || code === 99) return "⛈";
  if (code === 51 || code === 53 || code === 55 || code === 61 || code === 63 || code === 65 || code === 80 || code === 81 || code === 82) {
    return "🌧";
  }
  return "🌡";
}

function displayCondition(row: DailyForecastRow, emoji: boolean): string {
  return emoji ? `${conditionEmoji(row)} ${row.condition}` : row.condition;
}

function formatTemperature(valueC: number, units: WeatherUnits): string {
  if (units === "us") {
    return `${formatDecimal((valueC * 9) / 5 + 32)}°F`;
  }
  return `${formatDecimal(valueC)}°C`;
}

function formatTemperatureRange(minC: number, maxC: number, units: WeatherUnits): string {
  if (units === "us") {
    return `${formatDecimal((minC * 9) / 5 + 32)}-${formatDecimal((maxC * 9) / 5 + 32)}°F`;
  }
  return `${formatDecimal(minC)}-${formatDecimal(maxC)}°C`;
}

function formatWind(valueKmh: number, windUnit: WindUnit): string {
  if (windUnit === "ms") {
    return `${formatDecimal(valueKmh / 3.6)} m/s`;
  }
  if (windUnit === "mph") {
    return `${formatDecimal(valueKmh * 0.621371)} mph`;
  }
  return `${formatDecimal(valueKmh)} km/h`;
}

function markdownLink(label: string, url: string | undefined): string {
  return url ? `[${label}](${url})` : label;
}

function provenanceLine(input: { source: string; sourceUrl?: string; service: string; serviceUrl?: string; generatedAt: string }): string {
  return `数据和位置服务：${markdownLink(input.source, input.sourceUrl)}，由 ${markdownLink(input.service, input.serviceUrl)} 编辑/整理于 ${input.generatedAt}。`;
}

function provenance(input: ForecastMarkdownInput): string[] {
  return [provenanceLine(input)];
}

function dayLabel(title: string): string {
  if (title.includes("明天")) return "明天";
  if (title.includes("今天")) return "今天";
  return "";
}

export function compileForecastMarkdown(input: ForecastMarkdownInput): string {
  if (input.profile === "brief" && input.rows.length === 1) {
    const row = input.rows[0]!;
    const label = dayLabel(input.title);
    return [
      `# ${input.title}`,
      "",
      `${input.location}${label ? label : ` ${row.date}`}：${displayCondition(row, input.emoji)}，${formatTemperatureRange(row.tempMinC, row.tempMaxC, input.units)}，最高降水概率 ${row.precipitationProbabilityMax}%，最大风速 ${formatWind(row.windSpeedMaxKmh, input.windUnit)}。`,
      "",
      ...provenance(input)
    ].join("\n");
  }

  const lines = [
    `# ${input.title}`,
    "",
    "| 日期 | 天气 | 最低温 | 最高温 | 最高降水概率 | 最大风速 |",
    "|---|---|---:|---:|---:|---:|",
    ...input.rows.map(
      (row) =>
        `| ${row.date} | ${displayCondition(row, input.emoji)} | ${formatTemperature(row.tempMinC, input.units)} | ${formatTemperature(row.tempMaxC, input.units)} | ${row.precipitationProbabilityMax}% | ${formatWind(row.windSpeedMaxKmh, input.windUnit)} |`
    ),
    "",
    ...provenance(input)
  ];
  return lines.join("\n");
}

export function compileCurrentWeatherMarkdown(input: CurrentWeatherMarkdownInput): string {
  const units = input.units ?? "metric";
  const windUnit = input.windUnit ?? "kmh";
  const row = {
    date: "",
    condition: input.condition,
    conditionCode: input.conditionCode,
    tempMinC: input.temperatureC,
    tempMaxC: input.temperatureC,
    precipitationProbabilityMax: 0,
    windSpeedMaxKmh: input.windSpeedKmh
  };
  const footer =
    input.geocodingSource && input.service && input.generatedAt
      ? [
          provenanceLine({
            source: input.source,
            sourceUrl: input.sourceUrl,
            service: input.service,
            serviceUrl: input.serviceUrl,
            generatedAt: input.generatedAt
          })
        ]
      : [`数据源：${input.source}`];
  return [
    `# ${input.location}当前天气`,
    "",
    `${input.location}当前${displayCondition(row, input.emoji ?? false)}，${formatTemperature(input.temperatureC, units)}，体感 ${formatTemperature(input.apparentTemperatureC, units)}。湿度 ${input.humidityPercent}%，风速 ${formatWind(input.windSpeedKmh, windUnit)}。`,
    "",
    ...footer
  ].join("\n");
}

export function compileDailyForecastMarkdown(input: DailyForecastMarkdownInput): string {
  const row = input.row;
  return [
    `# ${input.location} ${input.date} 天气`,
    "",
    "| 天气 | 最低温 | 最高温 | 最高降水概率 | 最大风速 |",
    "|---|---:|---:|---:|---:|",
    `| ${row.condition} | ${formatDecimal(row.tempMinC)}°C | ${formatDecimal(row.tempMaxC)}°C | ${row.precipitationProbabilityMax}% | ${formatDecimal(row.windSpeedMaxKmh)} km/h |`,
    "",
    `数据源：${input.source}`
  ].join("\n");
}

export function compileSevenDayForecastMarkdown(input: SevenDayForecastMarkdownInput): string {
  const lines = [
    `# ${input.location} 7 日天气预报`,
    "",
    "| 日期 | 天气 | 最低温 | 最高温 | 最高降水概率 | 最大风速 |",
    "|---|---|---:|---:|---:|---:|",
    ...input.rows.map(
      (row) =>
        `| ${row.date} | ${row.condition} | ${formatDecimal(row.tempMinC)}°C | ${formatDecimal(row.tempMaxC)}°C | ${row.precipitationProbabilityMax}% | ${formatDecimal(row.windSpeedMaxKmh)} km/h |`
    ),
    "",
    `数据源：${input.source}`
  ];
  return lines.join("\n");
}
