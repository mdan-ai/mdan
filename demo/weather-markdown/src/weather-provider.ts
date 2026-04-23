export interface ResolvedLocation {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface CoordinateLookup {
  latitude: number;
  longitude: number;
  timezone?: string;
  label?: string;
}

export interface WeatherDataSource {
  name: string;
  url: string;
  geocodingName: string;
}

export interface WeatherProviderCapabilities {
  maxForecastDays: number;
}

export interface CurrentWeatherData {
  condition?: string;
  conditionCode: number;
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPercent: number;
  windSpeedKmh: number;
}

export interface DailyForecastData {
  dates: string[];
  conditionNames?: string[];
  conditionCodes: number[];
  tempMaxC: number[];
  tempMinC: number[];
  precipitationProbabilityMax: number[];
  windSpeedMaxKmh: number[];
}

export interface WeatherProvider {
  source: WeatherDataSource;
  capabilities: WeatherProviderCapabilities;
  resolveLocation(location: string, options?: { locale?: string }): Promise<ResolvedLocation>;
  resolveCoordinates(coordinates: CoordinateLookup, options?: { locale?: string }): Promise<ResolvedLocation>;
  getCurrentWeather(location: ResolvedLocation, options?: { locale?: string }): Promise<CurrentWeatherData>;
  getDailyForecast(location: ResolvedLocation, options: { date: string; locale?: string }): Promise<DailyForecastData>;
  getForecast(location: ResolvedLocation, options?: { days?: number; locale?: string }): Promise<DailyForecastData>;
}
