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

export interface HomeForecastMarkdownInput {
  location: string;
  rows: DailyForecastRow[];
  source: string;
  sourceUrl?: string;
  service: string;
  serviceUrl?: string;
  generatedAt: string;
  locale: string;
  units: WeatherUnits;
  windUnit: WindUnit;
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
  locale?: string;
  profile?: WeatherProfile;
  units?: WeatherUnits;
  windUnit?: WindUnit;
  emoji?: boolean;
}

function isZhLocale(locale: string): boolean {
  return locale.startsWith("zh");
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
  const zh = isZhLocale((input as { locale?: string }).locale ?? "zh-CN");
  return zh ? `来源：${markdownLink(input.source, input.sourceUrl)}` : `Source: ${markdownLink(input.source, input.sourceUrl)}`;
}

function provenance(input: ForecastMarkdownInput): string[] {
  return [provenanceLine(input)];
}

function homeProvenance(input: HomeForecastMarkdownInput): string[] {
  return [provenanceLine(input)];
}

function maxTemp(rows: DailyForecastRow[]): number {
  return Math.max(...rows.map((row) => row.tempMaxC));
}

function minTemp(rows: DailyForecastRow[]): number {
  return Math.min(...rows.map((row) => row.tempMinC));
}

function maxPrecipitation(rows: DailyForecastRow[]): number {
  return Math.max(...rows.map((row) => row.precipitationProbabilityMax));
}

function maxWind(rows: DailyForecastRow[]): number {
  return Math.max(...rows.map((row) => row.windSpeedMaxKmh));
}

function todaySummary(input: ForecastMarkdownInput): string {
  const row = input.rows[0]!;
  const zh = isZhLocale(input.locale);
  return zh
    ? `${input.location}今天：${displayCondition(row, input.emoji)}，${formatTemperatureRange(row.tempMinC, row.tempMaxC, input.units)}，最高降水概率 ${row.precipitationProbabilityMax}%，最大风速 ${formatWind(row.windSpeedMaxKmh, input.windUnit)}。`
    : `Today in ${input.location}: ${displayCondition(row, input.emoji)}, ${formatTemperatureRange(row.tempMinC, row.tempMaxC, input.units)}, max precipitation ${row.precipitationProbabilityMax}%, max wind ${formatWind(row.windSpeedMaxKmh, input.windUnit)}.`;
}

function homeTodaySummary(input: HomeForecastMarkdownInput): string {
  const row = input.rows[0]!;
  const zh = isZhLocale(input.locale);
  return zh
    ? `${input.location}今天：${displayCondition(row, input.emoji)}，${formatTemperatureRange(row.tempMinC, row.tempMaxC, input.units)}，最高降水概率 ${row.precipitationProbabilityMax}%，最大风速 ${formatWind(row.windSpeedMaxKmh, input.windUnit)}。`
    : `Today in ${input.location}: ${displayCondition(row, input.emoji)}, ${formatTemperatureRange(row.tempMinC, row.tempMaxC, input.units)}, max precipitation ${row.precipitationProbabilityMax}%, max wind ${formatWind(row.windSpeedMaxKmh, input.windUnit)}.`;
}

function dayLabel(title: string): string {
  if (title.includes("明天")) return "明天";
  if (title.includes("今天")) return "今天";
  return "";
}

function detailHeading(locale: string): string {
  return isZhLocale(locale) ? "详细信息" : "Details";
}

function summaryHeading(locale: string): string {
  return isZhLocale(locale) ? "摘要" : "Summary";
}

function tableHeader(locale: string): [string, string] {
  if (isZhLocale(locale)) {
    return ["| 日期 | 天气 | 最低温 | 最高温 | 最高降水概率 | 最大风速 |", "|---|---|---:|---:|---:|---:|"];
  }
  return ["| Date | Condition | Low | High | Max precip. | Max wind |", "|---|---|---:|---:|---:|---:|"];
}

export function compileForecastMarkdown(input: ForecastMarkdownInput): string {
  if (input.profile === "brief" && input.rows.length === 1) {
    const row = input.rows[0]!;
    const label = dayLabel(input.title);
    const zh = isZhLocale(input.locale);
    return zh
      ? `${input.location}${label ? label : ` ${row.date}`}：${displayCondition(row, input.emoji)}，${formatTemperatureRange(row.tempMinC, row.tempMaxC, input.units)}，最高降水概率 ${row.precipitationProbabilityMax}%，最大风速 ${formatWind(row.windSpeedMaxKmh, input.windUnit)}。`
      : `${input.title}: ${displayCondition(row, input.emoji)}, ${formatTemperatureRange(row.tempMinC, row.tempMaxC, input.units)}, max precipitation ${row.precipitationProbabilityMax}%, max wind ${formatWind(row.windSpeedMaxKmh, input.windUnit)}.`;
  }

  if (input.profile === "full" && input.rows.length === 1) {
    const row = input.rows[0]!;
    const label = dayLabel(input.title);
    const zh = isZhLocale(input.locale);
    return [
      `# ${input.title}`,
      "",
      zh
        ? `${input.location}${label ? label : ` ${row.date}`}：${displayCondition(row, input.emoji)}，${formatTemperatureRange(row.tempMinC, row.tempMaxC, input.units)}。`
        : `${input.title}: ${displayCondition(row, input.emoji)}, ${formatTemperatureRange(row.tempMinC, row.tempMaxC, input.units)}.`,
      "",
      `- ${detailHeading(input.locale)}`,
      zh
        ? `  - 最低温：${formatTemperature(row.tempMinC, input.units)}`
        : `  - Low: ${formatTemperature(row.tempMinC, input.units)}`,
      zh
        ? `  - 最高温：${formatTemperature(row.tempMaxC, input.units)}`
        : `  - High: ${formatTemperature(row.tempMaxC, input.units)}`,
      zh
        ? `  - 最高降水概率：${row.precipitationProbabilityMax}%`
        : `  - Max precipitation: ${row.precipitationProbabilityMax}%`,
      zh
        ? `  - 最大风速：${formatWind(row.windSpeedMaxKmh, input.windUnit)}`
        : `  - Max wind: ${formatWind(row.windSpeedMaxKmh, input.windUnit)}`,
      "",
      ...provenance(input)
    ].join("\n");
  }

  if (input.profile === "full") {
    const first = input.rows[0]!;
    const last = input.rows[input.rows.length - 1]!;
    const zh = isZhLocale(input.locale);
    const overallSummary = zh
      ? `${input.location}接下来 ${input.rows.length} 天覆盖 ${first.date} 到 ${last.date}，最低 ${formatTemperature(minTemp(input.rows), input.units)}，最高 ${formatTemperature(maxTemp(input.rows), input.units)}。`
      : `${input.location} over the next ${input.rows.length} days (${first.date} to ${last.date}), low ${formatTemperature(minTemp(input.rows), input.units)}, high ${formatTemperature(maxTemp(input.rows), input.units)}.`;
    const [header, divider] = tableHeader(input.locale);
    const lines = [
      `# ${input.title}`,
      "",
      todaySummary(input),
      "",
      `- ${summaryHeading(input.locale)}`,
      `  - ${overallSummary}`,
      zh
        ? `  - 最高降水概率：${maxPrecipitation(input.rows)}%`
        : `  - Max precipitation: ${maxPrecipitation(input.rows)}%`,
      zh
        ? `  - 最大风速：${formatWind(maxWind(input.rows), input.windUnit)}`
        : `  - Max wind: ${formatWind(maxWind(input.rows), input.windUnit)}`,
      "",
      header,
      divider,
      ...input.rows.map(
        (row) =>
          `| ${row.date} | ${displayCondition(row, input.emoji)} | ${formatTemperature(row.tempMinC, input.units)} | ${formatTemperature(row.tempMaxC, input.units)} | ${row.precipitationProbabilityMax}% | ${formatWind(row.windSpeedMaxKmh, input.windUnit)} |`
      ),
      "",
      ...provenance(input)
    ];
    return lines.join("\n");
  }

  const [header, divider] = tableHeader(input.locale);
  const lines = [
    `# ${input.title}`,
    "",
    header,
    divider,
    ...input.rows.map(
      (row) =>
        `| ${row.date} | ${displayCondition(row, input.emoji)} | ${formatTemperature(row.tempMinC, input.units)} | ${formatTemperature(row.tempMaxC, input.units)} | ${row.precipitationProbabilityMax}% | ${formatWind(row.windSpeedMaxKmh, input.windUnit)} |`
    ),
    "",
    ...provenance(input)
  ];
  return lines.join("\n");
}

export function compileHomeForecastMarkdown(input: HomeForecastMarkdownInput): string {
  const [header, divider] = tableHeader(input.locale);
  return [
    homeTodaySummary(input),
    "",
    header,
    divider,
    ...input.rows.map(
      (row) =>
        `| ${row.date} | ${displayCondition(row, input.emoji)} | ${formatTemperature(row.tempMinC, input.units)} | ${formatTemperature(row.tempMaxC, input.units)} | ${row.precipitationProbabilityMax}% | ${formatWind(row.windSpeedMaxKmh, input.windUnit)} |`
    ),
    "",
    ...homeProvenance(input)
  ].join("\n");
}

export function compileCurrentWeatherMarkdown(input: CurrentWeatherMarkdownInput): string {
  const units = input.units ?? "metric";
  const windUnit = input.windUnit ?? "kmh";
  const locale = (input as { locale?: string }).locale ?? "zh-CN";
  const zh = isZhLocale(locale);
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
            generatedAt: input.generatedAt,
            locale
          })
        ]
      : [zh ? `数据源：${input.source}` : `Source: ${input.source}`];

  if (input.profile === "full") {
    return [
      `# ${zh ? `${input.location}当前天气` : `Current weather in ${input.location}`}`,
      "",
      zh
        ? `${input.location}当前${displayCondition(row, input.emoji ?? false)}，${formatTemperature(input.temperatureC, units)}，体感 ${formatTemperature(input.apparentTemperatureC, units)}。`
        : `Current weather in ${input.location}: ${displayCondition(row, input.emoji ?? false)}, ${formatTemperature(input.temperatureC, units)}, feels like ${formatTemperature(input.apparentTemperatureC, units)}.`,
      "",
      `- ${detailHeading(locale)}`,
      zh ? `  - 湿度：${input.humidityPercent}%` : `  - Humidity: ${input.humidityPercent}%`,
      zh ? `  - 风速：${formatWind(input.windSpeedKmh, windUnit)}` : `  - Wind: ${formatWind(input.windSpeedKmh, windUnit)}`,
      "",
      ...footer
    ].join("\n");
  }

  return zh
    ? `${input.location}当前${displayCondition(row, input.emoji ?? false)}，${formatTemperature(input.temperatureC, units)}，体感 ${formatTemperature(input.apparentTemperatureC, units)}。湿度 ${input.humidityPercent}%，风速 ${formatWind(input.windSpeedKmh, windUnit)}。`
    : `Current weather in ${input.location}: ${displayCondition(row, input.emoji ?? false)}, ${formatTemperature(input.temperatureC, units)}, feels like ${formatTemperature(input.apparentTemperatureC, units)}. Humidity ${input.humidityPercent}%, wind ${formatWind(input.windSpeedKmh, windUnit)}.`;
}
