export type WeatherCondition = 'SUNNY' | 'CLOUDY' | 'RAIN' | 'FOG';
export type WindState = 'CALM' | 'BREEZE' | 'GALE' | 'STORM';

export type WeatherState = {
  condition: WeatherCondition;
  wind: WindState;
  temperature: number;
  humidity: number;
  precipitation: number;
  remainingMinutes: number;
};
